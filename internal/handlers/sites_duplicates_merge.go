package handlers

import (
	"fmt"
	"strings"

	"ai-sign-in-gateway/internal/models"
	"ai-sign-in-gateway/internal/services"
	"gorm.io/gorm"
)

const duplicateMergeReferenceBatchSize = 300

type duplicateSiteMergeResult struct {
	MergedGroupCount    int    `json:"merged_group_count"`
	DeletedSiteCount    int    `json:"deleted_site_count"`
	RemainingGroupCount int    `json:"remaining_group_count"`
	KeptSiteIDs         []uint `json:"kept_site_ids"`
	DeletedSiteIDs      []uint `json:"deleted_site_ids"`
}

type duplicateRouteReferenceMigration struct {
	KeepID            uint
	RemovedRoutes     []models.GatewayRouteState
	RemovedRouteIDs   []uint
	RouteGroupMembers []models.GatewayRouteGroupMember
}

func mergeDuplicateSites(db *gorm.DB) (duplicateSiteMergeResult, error) {
	var result duplicateSiteMergeResult
	groups, err := duplicateSiteGroups(db)
	if err != nil {
		return result, err
	}
	err = db.Transaction(func(tx *gorm.DB) error {
		routeMigrations := []duplicateRouteReferenceMigration{}
		for _, group := range groups {
			if err := mergeDuplicateSiteGroup(tx, group, &result, &routeMigrations); err != nil {
				return err
			}
		}
		if result.MergedGroupCount == 0 {
			return nil
		}
		if _, err := services.SyncGatewayRoutes(tx); err != nil {
			return err
		}
		return reassignDuplicateRouteReferences(tx, routeMigrations)
	})
	if err != nil {
		return result, err
	}
	remaining, err := duplicateSiteGroups(db)
	if err != nil {
		return result, err
	}
	result.RemainingGroupCount = len(remaining)
	return result, nil
}

func mergeDuplicateSiteGroup(tx *gorm.DB, group duplicateSiteGroup, result *duplicateSiteMergeResult, routeMigrations *[]duplicateRouteReferenceMigration) error {
	var keep models.Site
	if err := tx.First(&keep, group.SuggestedKeepID).Error; err != nil {
		return err
	}
	var removed []models.Site
	if err := tx.Where("id IN ? AND id <> ?", group.SiteIDs, group.SuggestedKeepID).Find(&removed).Error; err != nil {
		return err
	}
	removedIDs := make([]uint, 0, len(removed))
	for _, site := range removed {
		mergeDuplicateSiteData(&keep, site)
		removedIDs = append(removedIDs, site.ID)
	}
	if len(removed) == 0 {
		return nil
	}
	if err := tx.Save(&keep).Error; err != nil {
		return err
	}
	if err := deleteDuplicateSiteRecords(tx, keep.ID, removedIDs, routeMigrations); err != nil {
		return err
	}
	result.KeptSiteIDs = append(result.KeptSiteIDs, keep.ID)
	result.DeletedSiteIDs = append(result.DeletedSiteIDs, removedIDs...)
	result.MergedGroupCount++
	result.DeletedSiteCount += len(removed)
	return nil
}

func mergeDuplicateSiteData(keep *models.Site, duplicate models.Site) {
	keep.Credentials = mergeMissingJSONFields(keep.Credentials, duplicate.Credentials)
	keep.PluginConfig = mergeMissingJSONFields(keep.PluginConfig, duplicate.PluginConfig)
	keep.GroupName = strings.Join(uniqueGroupNames(append(parseGroupNamesGo(keep.GroupName), parseGroupNamesGo(duplicate.GroupName)...)), ",")
	keep.Notes = mergeDuplicateNotes(keep.Notes, duplicate.Notes)
	if !keep.IsEnabled && duplicate.IsEnabled {
		keep.IsEnabled = true
	}
}

func deleteDuplicateSiteRecords(tx *gorm.DB, keepID uint, siteIDs []uint, routeMigrations *[]duplicateRouteReferenceMigration) error {
	siteIDs = uniqueUintIDs(siteIDs)
	if keepID == 0 || len(siteIDs) == 0 {
		return nil
	}
	removedRoutes, err := duplicateRouteStatesForSites(tx, siteIDs)
	if err != nil {
		return err
	}
	routeIDs := routeStateIDs(removedRoutes)
	routeGroupMembers, err := duplicateRouteGroupMembersForRoutes(tx, routeIDs)
	if err != nil {
		return err
	}
	*routeMigrations = append(*routeMigrations, duplicateRouteReferenceMigration{
		KeepID:            keepID,
		RemovedRoutes:     removedRoutes,
		RemovedRouteIDs:   routeIDs,
		RouteGroupMembers: routeGroupMembers,
	})
	if len(routeIDs) > 0 {
		if err := tx.Where("route_state_id IN ?", routeIDs).Delete(&models.GatewayRouteGroupMember{}).Error; err != nil {
			return err
		}
	}
	if err := tx.Where("site_id IN ?", siteIDs).Delete(&models.GatewayRouteState{}).Error; err != nil {
		return err
	}
	if err := tx.Where("site_id IN ?", siteIDs).Delete(&models.SiteQueueTask{}).Error; err != nil {
		return err
	}
	if err := reassignDuplicateSiteReferences(tx, keepID, siteIDs); err != nil {
		return err
	}
	return tx.Where("id IN ?", siteIDs).Delete(&models.Site{}).Error
}

func duplicateRouteStatesForSites(tx *gorm.DB, siteIDs []uint) ([]models.GatewayRouteState, error) {
	var routes []models.GatewayRouteState
	err := tx.Preload("Site").Where("site_id IN ?", siteIDs).Find(&routes).Error
	return routes, err
}

func routeStateIDs(routes []models.GatewayRouteState) []uint {
	ids := make([]uint, 0, len(routes))
	for _, route := range routes {
		if route.ID != 0 {
			ids = append(ids, route.ID)
		}
	}
	return ids
}

func duplicateRouteGroupMembersForRoutes(tx *gorm.DB, routeIDs []uint) ([]models.GatewayRouteGroupMember, error) {
	if len(routeIDs) == 0 {
		return nil, nil
	}
	var members []models.GatewayRouteGroupMember
	err := tx.Where("route_state_id IN ?", routeIDs).Find(&members).Error
	return members, err
}

func duplicateRouteIDMap(tx *gorm.DB, keepID uint, removed []models.GatewayRouteState) (map[uint]uint, error) {
	if len(removed) == 0 {
		return map[uint]uint{}, nil
	}
	var kept []models.GatewayRouteState
	if err := tx.Preload("Site").Where("site_id = ?", keepID).Find(&kept).Error; err != nil {
		return nil, err
	}
	keptByRouteSignature := map[string]uint{}
	for _, route := range kept {
		signature := duplicateRouteSignature(route)
		if signature == "" || keptByRouteSignature[signature] != 0 {
			continue
		}
		keptByRouteSignature[signature] = route.ID
	}
	out := map[uint]uint{}
	for _, route := range removed {
		if targetID := keptByRouteSignature[duplicateRouteSignature(route)]; targetID != 0 {
			out[route.ID] = targetID
		}
	}
	return out, nil
}

func reassignDuplicateRouteReferences(tx *gorm.DB, migrations []duplicateRouteReferenceMigration) error {
	for _, migration := range migrations {
		routeIDMap, err := duplicateRouteIDMap(tx, migration.KeepID, migration.RemovedRoutes)
		if err != nil {
			return err
		}
		if err := reassignDuplicateRouteGroupMembers(tx, migration.RouteGroupMembers, routeIDMap); err != nil {
			return err
		}
		if err := reassignDuplicateRouteLogReferences(tx, routeIDMap); err != nil {
			return err
		}
		if err := clearUnmappedDuplicateRouteReferences(tx, migration.RemovedRouteIDs, routeIDMap); err != nil {
			return err
		}
	}
	return nil
}

func reassignDuplicateRouteGroupMembers(tx *gorm.DB, members []models.GatewayRouteGroupMember, routeIDMap map[uint]uint) error {
	for _, member := range members {
		targetRouteID := routeIDMap[member.RouteStateID]
		if targetRouteID == 0 {
			continue
		}
		moved := models.GatewayRouteGroupMember{GroupID: member.GroupID, RouteStateID: targetRouteID}
		if err := tx.Where("group_id = ? AND route_state_id = ?", moved.GroupID, moved.RouteStateID).
			FirstOrCreate(&moved).Error; err != nil {
			return err
		}
	}
	return nil
}

func duplicateRouteSignature(route models.GatewayRouteState) string {
	routeKey := duplicateRouteSignatureKey(route)
	if routeKey == "" {
		return ""
	}
	return strings.Join([]string{
		routeKey,
		normalizeGatewayRouteType(route.RouteType),
		services.NormalizeGatewayRoutePath(route.RoutePath),
	}, "\x00")
}

func duplicateRouteSignatureKey(route models.GatewayRouteState) string {
	apiKey := strings.TrimSpace(services.GatewayRouteAPIKeyForState(route))
	if apiKey != "" {
		return "key:" + apiKey
	}
	fingerprint := strings.TrimSpace(route.KeyFingerprint)
	if fingerprint == "" {
		return ""
	}
	return "fp:" + fingerprint
}

func reassignDuplicateSiteReferences(tx *gorm.DB, keepID uint, siteIDs []uint) error {
	updates := []func() error{
		func() error {
			return updateCheckinRunsInBatches(tx, "site_id IN ?", []any{siteIDs}, "site_id", keepID)
		},
		func() error {
			return updateGatewayRequestLogsInBatches(tx, "site_id IN ?", []any{siteIDs}, "site_id", keepID)
		},
		func() error {
			return updateChatSessionsInBatches(tx, "site_id IN ?", []any{siteIDs}, "site_id", keepID)
		},
	}
	for _, update := range updates {
		if err := update(); err != nil {
			return err
		}
	}
	return nil
}

func reassignDuplicateRouteLogReferences(tx *gorm.DB, routeIDMap map[uint]uint) error {
	removedIDs := sortedUintKeys(routeIDMap)
	if len(removedIDs) == 0 {
		return nil
	}
	for start := 0; start < len(removedIDs); start += duplicateMergeReferenceBatchSize {
		end := min(start+duplicateMergeReferenceBatchSize, len(removedIDs))
		routeIDChunk := removedIDs[start:end]
		routeIDChunkMap := uintMapSubset(routeIDMap, routeIDChunk)
		if err := reassignDuplicateRouteLogReferenceChunk(tx, routeIDChunk, routeIDChunkMap); err != nil {
			return err
		}
	}
	return nil
}

func reassignDuplicateRouteLogReferenceChunk(tx *gorm.DB, routeIDs []uint, routeIDMap map[uint]uint) error {
	var lastID uint
	for {
		ids, err := nextGatewayRequestLogIDs(tx, "route_state_id IN ?", []any{routeIDs}, lastID)
		if err != nil || len(ids) == 0 {
			return err
		}
		if err := updateGatewayRequestLogRouteStateBatch(tx, ids, routeIDMap); err != nil {
			return err
		}
		lastID = ids[len(ids)-1]
	}
}

func updateGatewayRequestLogRouteStateBatch(tx *gorm.DB, logIDs []uint, routeIDMap map[uint]uint) error {
	caseParts := make([]string, 0, len(routeIDMap))
	args := make([]any, 0, len(routeIDMap)*2)
	for _, removedID := range sortedUintKeys(routeIDMap) {
		caseParts = append(caseParts, "WHEN ? THEN ?")
		args = append(args, removedID, routeIDMap[removedID])
	}
	statement := "CASE route_state_id " + strings.Join(caseParts, " ") + " ELSE route_state_id END"
	return tx.Model(&models.GatewayRequestLog{}).
		Where("id IN ?", logIDs).
		Update("route_state_id", gorm.Expr(statement, args...)).Error
}

func sortedUintKeys(values map[uint]uint) []uint {
	keys := make([]uint, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	for i := 1; i < len(keys); i++ {
		value := keys[i]
		j := i - 1
		for j >= 0 && keys[j] > value {
			keys[j+1] = keys[j]
			j--
		}
		keys[j+1] = value
	}
	return keys
}

func uintMapSubset(values map[uint]uint, keys []uint) map[uint]uint {
	out := make(map[uint]uint, len(keys))
	for _, key := range keys {
		if value := values[key]; value != 0 {
			out[key] = value
		}
	}
	return out
}

func clearUnmappedDuplicateRouteReferences(tx *gorm.DB, removedRouteIDs []uint, routeIDMap map[uint]uint) error {
	unmapped := make([]uint, 0, len(removedRouteIDs))
	for _, routeID := range removedRouteIDs {
		if routeIDMap[routeID] == 0 {
			unmapped = append(unmapped, routeID)
		}
	}
	if len(unmapped) == 0 {
		return nil
	}
	for start := 0; start < len(unmapped); start += duplicateMergeReferenceBatchSize {
		end := min(start+duplicateMergeReferenceBatchSize, len(unmapped))
		if err := updateGatewayRequestLogsInBatches(tx, "route_state_id IN ?", []any{unmapped[start:end]}, "route_state_id", nil); err != nil {
			return err
		}
	}
	return nil
}

func updateCheckinRunsInBatches(tx *gorm.DB, where string, args []any, column string, value any) error {
	var lastID uint
	for {
		ids, err := nextCheckinRunIDs(tx, where, args, lastID)
		if err != nil || len(ids) == 0 {
			return err
		}
		if err := tx.Model(&models.CheckinRun{}).Where("id IN ?", ids).Update(column, value).Error; err != nil {
			return err
		}
		lastID = ids[len(ids)-1]
	}
}

func updateGatewayRequestLogsInBatches(tx *gorm.DB, where string, args []any, column string, value any) error {
	var lastID uint
	for {
		ids, err := nextGatewayRequestLogIDs(tx, where, args, lastID)
		if err != nil || len(ids) == 0 {
			return err
		}
		if err := tx.Model(&models.GatewayRequestLog{}).Where("id IN ?", ids).Update(column, value).Error; err != nil {
			return err
		}
		lastID = ids[len(ids)-1]
	}
}

func updateChatSessionsInBatches(tx *gorm.DB, where string, args []any, column string, value any) error {
	var lastID uint
	for {
		ids, err := nextChatSessionIDs(tx, where, args, lastID)
		if err != nil || len(ids) == 0 {
			return err
		}
		if err := tx.Model(&models.ChatSession{}).Where("id IN ?", ids).Update(column, value).Error; err != nil {
			return err
		}
		lastID = ids[len(ids)-1]
	}
}

func nextCheckinRunIDs(tx *gorm.DB, where string, args []any, afterID uint) ([]uint, error) {
	var ids []uint
	err := tx.Model(&models.CheckinRun{}).
		Where("id > ?", afterID).
		Where(where, args...).
		Order("id asc").
		Limit(duplicateMergeReferenceBatchSize).
		Pluck("id", &ids).Error
	return ids, err
}

func nextGatewayRequestLogIDs(tx *gorm.DB, where string, args []any, afterID uint) ([]uint, error) {
	var ids []uint
	err := tx.Model(&models.GatewayRequestLog{}).
		Where("id > ?", afterID).
		Where(where, args...).
		Order("id asc").
		Limit(duplicateMergeReferenceBatchSize).
		Pluck("id", &ids).Error
	return ids, err
}

func nextChatSessionIDs(tx *gorm.DB, where string, args []any, afterID uint) ([]uint, error) {
	var ids []uint
	err := tx.Model(&models.ChatSession{}).
		Where("id > ?", afterID).
		Where(where, args...).
		Order("id asc").
		Limit(duplicateMergeReferenceBatchSize).
		Pluck("id", &ids).Error
	return ids, err
}

func mergeMissingJSONFields(base models.JSONMap, updates models.JSONMap) models.JSONMap {
	out := cloneJSONMap(nonNilJSON(base))
	for key, value := range nonNilJSON(updates) {
		if key == "api_keys" {
			out[key] = mergeDuplicateAPIKeyLists(out[key], value)
			continue
		}
		if jsonValueIsEmpty(out[key]) && !jsonValueIsEmpty(value) {
			out[key] = value
		}
	}
	return out
}

type duplicateAPIKeyMergeIndex struct {
	byIdentity map[string]int
	byConfig   map[string]int
	byValue    map[string]int
}

const duplicateAPIKeyAmbiguousValueIndex = -1

func newDuplicateAPIKeyMergeIndex() duplicateAPIKeyMergeIndex {
	return duplicateAPIKeyMergeIndex{
		byIdentity: map[string]int{},
		byConfig:   map[string]int{},
		byValue:    map[string]int{},
	}
}

func mergeDuplicateAPIKeyLists(preferredValue any, extraValue any) []map[string]any {
	merged := []map[string]any{}
	index := newDuplicateAPIKeyMergeIndex()
	for _, item := range apiKeyListFromAny(preferredValue) {
		index.add(&merged, item)
	}
	for _, item := range apiKeyListFromAny(extraValue) {
		index.add(&merged, item)
	}
	return merged
}

func (i duplicateAPIKeyMergeIndex) add(merged *[]map[string]any, item map[string]any) {
	identity := apiKeyEntryIdentity(item)
	if identity == "" {
		return
	}
	if i.preserveExisting(merged, item, identity) {
		return
	}
	pos := len(*merged)
	*merged = append(*merged, item)
	i.byIdentity[identity] = pos
	signature := apiKeyEntryConfigSignature(item)
	if signature != "" {
		i.byConfig[signature] = pos
	}
	if value := apiKeyEntryValue(item); value != "" {
		i.addValue(value, pos)
	}
}

func (i duplicateAPIKeyMergeIndex) addValue(value string, pos int) {
	current, ok := i.byValue[value]
	if !ok {
		i.byValue[value] = pos
		return
	}
	if current != pos {
		i.byValue[value] = duplicateAPIKeyAmbiguousValueIndex
	}
}

func (i duplicateAPIKeyMergeIndex) preserveExisting(merged *[]map[string]any, item map[string]any, identity string) bool {
	if pos, ok := i.byIdentity[identity]; ok {
		mergeDuplicateAPIKeyMetadata((*merged)[pos], item)
		return true
	}
	signature := apiKeyEntryConfigSignature(item)
	if signature != "" {
		if pos, ok := i.byConfig[signature]; ok {
			mergeDuplicateAPIKeyMetadata((*merged)[pos], item)
			return true
		}
	}
	value := apiKeyEntryValue(item)
	if value != "" {
		if pos, ok := i.byValue[value]; ok && pos >= 0 && apiKeyEntryValueFallbackAllowed((*merged)[pos], item) {
			mergeDuplicateAPIKeyMetadata((*merged)[pos], item)
			return true
		}
	}
	return false
}

func mergeDuplicateAPIKeyMetadata(target map[string]any, item map[string]any) {
	if apiKeyEntryMetadataStrength(item) > apiKeyEntryMetadataStrength(target) {
		for _, key := range []string{"id", "name", "source", "status"} {
			if value := apiKeyEntryOptionalString(item, key); value != "" {
				target[key] = item[key]
			}
		}
	}
	fillMissingDuplicateAPIKeyRouteMetadata(target, item)
	preserveLocalAPIKeyRequestBaseURLs(target, item)
}

func apiKeyEntryMetadataStrength(item map[string]any) int {
	score := 0
	if apiKeyEntryOptionalString(item, "id") != "" {
		score += 4
	}
	source := strings.ToLower(apiKeyEntryOptionalString(item, "source"))
	if source != "" && source != "manual" && source != "custom" && source != "user" {
		score += 2
	}
	if apiKeyEntryOptionalString(item, "status") != "" {
		score++
	}
	return score
}

func fillMissingDuplicateAPIKeyRouteMetadata(target map[string]any, item map[string]any) {
	for _, key := range []string{"route_type", "api_type", "api_format", "type", "route_path", "request_path", "gateway_route_path", "image_generation_path", "image_edit_path"} {
		if apiKeyEntryOptionalString(target, key) == "" && apiKeyEntryOptionalString(item, key) != "" {
			target[key] = item[key]
		}
	}
}

func apiKeyEntryValueFallbackAllowed(existing map[string]any, item map[string]any) bool {
	if apiKeyEntryRouteConfigSignature(existing) == "" || apiKeyEntryRouteConfigSignature(item) == "" {
		return true
	}
	return apiKeyEntryRouteIdentitySignature(existing) == apiKeyEntryRouteIdentitySignature(item)
}

func apiKeyEntryRouteConfigSignature(item map[string]any) string {
	parts := []string{
		apiKeyRouteType(item),
		apiKeyRoutePath(item),
		strings.Join(apiKeyRequestBaseURLValues(item), "\n"),
		apiKeyEntryOptionalString(item, "image_generation_path"),
		apiKeyEntryOptionalString(item, "image_edit_path"),
	}
	if stringPartsEmpty(parts) {
		return ""
	}
	return strings.Join(parts, "\x00")
}

func apiKeyEntryRouteIdentitySignature(item map[string]any) string {
	parts := []string{
		apiKeyRouteType(item),
		apiKeyRoutePath(item),
		apiKeyEntryOptionalString(item, "image_generation_path"),
		apiKeyEntryOptionalString(item, "image_edit_path"),
	}
	if stringPartsEmpty(parts) {
		return ""
	}
	return strings.Join(parts, "\x00")
}

func stringPartsEmpty(parts []string) bool {
	for _, part := range parts {
		if strings.TrimSpace(part) != "" {
			return false
		}
	}
	return true
}

func apiKeyEntryOptionalString(item map[string]any, key string) string {
	value, ok := item[key]
	if !ok || value == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(value))
}

func uniqueUintIDs(values []uint) []uint {
	seen := map[uint]bool{}
	out := make([]uint, 0, len(values))
	for _, value := range values {
		if value == 0 || seen[value] {
			continue
		}
		seen[value] = true
		out = append(out, value)
	}
	return out
}
