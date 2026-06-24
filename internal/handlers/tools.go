package handlers

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"sort"
	"strconv"
	"strings"
	"time"

	"ai-sign-in-gateway/internal/httpx"
	"ai-sign-in-gateway/internal/models"
	"ai-sign-in-gateway/internal/schemas"
	"ai-sign-in-gateway/internal/services"
	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

func (a *App) ToolRoutes(r chi.Router) {
	r.Post("/models", a.ModelList)
	r.Post("/chat-test", a.ChatTest)
	r.Get("/chat-sessions", a.ListChatSessions)
	r.Post("/chat-sessions", a.CreateChatSession)
	r.Get("/chat-sessions/{sessionID}", a.GetChatSession)
	r.Put("/chat-sessions/{sessionID}", a.UpdateChatSession)
	r.Delete("/chat-sessions/{sessionID}", a.DeleteChatSession)
	r.Post("/chat-sessions/{sessionID}/messages", a.AppendChatSessionMessages)
}

func (a *App) ListChatSessions(w http.ResponseWriter, r *http.Request) {
	limit := chatSessionQueryInt(r, "limit", 50, 1, 200)
	var count int64
	if err := a.DB.Model(&models.ChatSession{}).Count(&count).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var sessions []models.ChatSession
	if err := a.DB.Order("updated_at desc, id desc").Limit(limit).Find(&sessions).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	items := make([]schemas.ChatSessionResponse, 0, len(sessions))
	for _, session := range sessions {
		items = append(items, chatSessionResponse(session))
	}
	writeJSON(w, http.StatusOK, schemas.ChatSessionListResponse{Items: items, Count: int(count)})
}

func (a *App) CreateChatSession(w http.ResponseWriter, r *http.Request) {
	var payload schemas.ChatSessionCreateRequest
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	session := models.ChatSession{
		Title:          normalizeChatSessionTitle(payload.Title),
		SiteID:         payload.SiteID,
		SiteName:       strings.TrimSpace(payload.SiteName),
		Model:          strings.TrimSpace(payload.Model),
		Mode:           normalizeChatModeName(payload.Mode),
		RouteType:      strings.TrimSpace(payload.RouteType),
		KeyFingerprint: strings.TrimSpace(payload.KeyFingerprint),
		KeyName:        strings.TrimSpace(payload.KeyName),
		ImageSize:      strings.TrimSpace(payload.ImageSize),
		ImageWidth:     payload.ImageWidth,
		ImageHeight:    payload.ImageHeight,
	}
	if err := a.DB.Create(&session).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, chatSessionResponse(session))
}

func (a *App) GetChatSession(w http.ResponseWriter, r *http.Request) {
	id, ok := chatSessionIDFromRequest(w, r)
	if !ok {
		return
	}
	detail, err := a.chatSessionDetail(id)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		writeError(w, http.StatusNotFound, "会话不存在")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, detail)
}

func (a *App) UpdateChatSession(w http.ResponseWriter, r *http.Request) {
	id, ok := chatSessionIDFromRequest(w, r)
	if !ok {
		return
	}
	var payload schemas.ChatSessionUpdateRequest
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	var session models.ChatSession
	if err := a.DB.First(&session, id).Error; errors.Is(err, gorm.ErrRecordNotFound) {
		writeError(w, http.StatusNotFound, "会话不存在")
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	updates := map[string]any{}
	if payload.Title != nil {
		updates["title"] = normalizeChatSessionTitle(*payload.Title)
	}
	if payload.SiteID != nil {
		updates["site_id"] = *payload.SiteID
	}
	if payload.SiteName != nil {
		updates["site_name"] = strings.TrimSpace(*payload.SiteName)
	}
	if payload.Model != nil {
		updates["model"] = strings.TrimSpace(*payload.Model)
	}
	if payload.Mode != nil {
		updates["mode"] = normalizeChatModeName(*payload.Mode)
	}
	if payload.RouteType != nil {
		updates["route_type"] = strings.TrimSpace(*payload.RouteType)
	}
	if payload.KeyFingerprint != nil {
		updates["key_fingerprint"] = strings.TrimSpace(*payload.KeyFingerprint)
	}
	if payload.KeyName != nil {
		updates["key_name"] = strings.TrimSpace(*payload.KeyName)
	}
	if payload.ImageSize != nil {
		updates["image_size"] = strings.TrimSpace(*payload.ImageSize)
	}
	if payload.ImageWidth != nil {
		updates["image_width"] = *payload.ImageWidth
	}
	if payload.ImageHeight != nil {
		updates["image_height"] = *payload.ImageHeight
	}
	if len(updates) > 0 {
		if err := a.DB.Model(&session).Updates(updates).Error; err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}
	if err := a.DB.First(&session, id).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, chatSessionResponse(session))
}

func (a *App) DeleteChatSession(w http.ResponseWriter, r *http.Request) {
	id, ok := chatSessionIDFromRequest(w, r)
	if !ok {
		return
	}
	err := a.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("session_id = ?", id).Delete(&models.ChatMessage{}).Error; err != nil {
			return err
		}
		result := tx.Delete(&models.ChatSession{}, id)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		return nil
	})
	if errors.Is(err, gorm.ErrRecordNotFound) {
		writeError(w, http.StatusNotFound, "会话不存在")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
}

func (a *App) AppendChatSessionMessages(w http.ResponseWriter, r *http.Request) {
	id, ok := chatSessionIDFromRequest(w, r)
	if !ok {
		return
	}
	var payload schemas.ChatSessionMessageRequest
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	if len(payload.Messages) == 0 {
		writeError(w, http.StatusBadRequest, "请提供会话消息")
		return
	}
	err := a.DB.Transaction(func(tx *gorm.DB) error {
		var session models.ChatSession
		if err := tx.First(&session, id).Error; err != nil {
			return err
		}
		var maxSeq int
		if err := tx.Model(&models.ChatMessage{}).
			Where("session_id = ?", id).
			Select("COALESCE(MAX(seq), 0)").
			Scan(&maxSeq).Error; err != nil {
			return err
		}
		now := tx.NowFunc()
		rows := make([]models.ChatMessage, 0, len(payload.Messages))
		for i, item := range payload.Messages {
			createdAt := now
			if item.CreatedAt != nil && !item.CreatedAt.IsZero() {
				createdAt = item.CreatedAt.UTC()
			}
			rows = append(rows, models.ChatMessage{
				SessionID:       id,
				Seq:             maxSeq + i + 1,
				Role:            normalizeChatMessageRole(item.Role),
				Content:         item.Content,
				Status:          normalizeChatMessageStatus(item.Status),
				Mode:            normalizeChatMessageMode(item.Mode),
				LatencyMS:       item.LatencyMS,
				StatusCode:      item.StatusCode,
				Error:           strings.TrimSpace(item.Error),
				ReferenceImages: chatImageRefsToJSONMap(item.ReferenceImages),
				Images:          chatImageRefsToJSONMap(item.Images),
				CreatedAt:       createdAt,
			})
		}
		if err := tx.Create(&rows).Error; err != nil {
			return err
		}
		return refreshChatSessionSummary(tx, id)
	})
	if errors.Is(err, gorm.ErrRecordNotFound) {
		writeError(w, http.StatusNotFound, "会话不存在")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	detail, err := a.chatSessionDetail(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, detail)
}

func chatSessionIDFromRequest(w http.ResponseWriter, r *http.Request) (uint, bool) {
	value, err := strconv.ParseUint(chi.URLParam(r, "sessionID"), 10, 64)
	if err != nil || value == 0 {
		writeError(w, http.StatusBadRequest, "会话 ID 无效")
		return 0, false
	}
	return uint(value), true
}

func (a *App) chatSessionDetail(id uint) (schemas.ChatSessionDetailResponse, error) {
	var session models.ChatSession
	if err := a.DB.First(&session, id).Error; err != nil {
		return schemas.ChatSessionDetailResponse{}, err
	}
	var messages []models.ChatMessage
	if err := a.DB.Where("session_id = ?", id).Order("seq asc, id asc").Find(&messages).Error; err != nil {
		return schemas.ChatSessionDetailResponse{}, err
	}
	out := schemas.ChatSessionDetailResponse{
		ChatSessionResponse: chatSessionResponse(session),
		Messages:            make([]schemas.ChatSessionMessageResponse, 0, len(messages)),
	}
	for _, message := range messages {
		out.Messages = append(out.Messages, chatMessageResponse(message))
	}
	return out, nil
}

func chatSessionResponse(session models.ChatSession) schemas.ChatSessionResponse {
	return schemas.ChatSessionResponse{
		ID:              session.ID,
		Title:           firstNonEmpty(strings.TrimSpace(session.Title), "新会话"),
		SiteID:          session.SiteID,
		SiteName:        session.SiteName,
		Model:           session.Model,
		Mode:            normalizeChatModeName(session.Mode),
		RouteType:       session.RouteType,
		KeyFingerprint:  session.KeyFingerprint,
		KeyName:         session.KeyName,
		ImageSize:       session.ImageSize,
		ImageWidth:      session.ImageWidth,
		ImageHeight:     session.ImageHeight,
		MessageCount:    session.MessageCount,
		LastMessageText: session.LastMessageText,
		CreatedAt:       session.CreatedAt,
		UpdatedAt:       session.UpdatedAt,
	}
}

func chatMessageResponse(message models.ChatMessage) schemas.ChatSessionMessageResponse {
	return schemas.ChatSessionMessageResponse{
		ID:              message.ID,
		SessionID:       message.SessionID,
		Seq:             message.Seq,
		Role:            normalizeChatMessageRole(message.Role),
		Content:         message.Content,
		Status:          normalizeChatMessageStatus(message.Status),
		Mode:            normalizeChatMessageMode(message.Mode),
		LatencyMS:       message.LatencyMS,
		StatusCode:      message.StatusCode,
		Error:           message.Error,
		ReferenceImages: chatImageRefsFromJSONMap(message.ReferenceImages),
		Images:          chatImageRefsFromJSONMap(message.Images),
		CreatedAt:       message.CreatedAt,
		UpdatedAt:       message.UpdatedAt,
	}
}

func refreshChatSessionSummary(db *gorm.DB, id uint) error {
	var messageCount int64
	if err := db.Model(&models.ChatMessage{}).Where("session_id = ?", id).Count(&messageCount).Error; err != nil {
		return err
	}
	var last models.ChatMessage
	lastText := ""
	err := db.Where("session_id = ?", id).Order("seq desc, id desc").First(&last).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	if err == nil {
		lastText = shortenChatSessionText(last.Content, 240)
		if strings.TrimSpace(lastText) == "" && strings.TrimSpace(last.Error) != "" {
			lastText = shortenChatSessionText(last.Error, 240)
		}
	}
	return db.Model(&models.ChatSession{}).Where("id = ?", id).Updates(map[string]any{
		"message_count":     int(messageCount),
		"last_message_text": lastText,
	}).Error
}

func normalizeChatSessionTitle(value string) string {
	return shortenChatSessionText(firstNonEmpty(strings.TrimSpace(value), "新会话"), 160)
}

func normalizeChatModeName(value string) string {
	if strings.EqualFold(strings.TrimSpace(value), "image") {
		return "image"
	}
	return "chat"
}

func normalizeChatMessageRole(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "system", "assistant", "user":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "user"
	}
}

func normalizeChatMessageStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "idle", "sending", "done", "error":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "done"
	}
}

func normalizeChatMessageMode(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "image":
		return "image"
	case "chat":
		return "chat"
	default:
		return ""
	}
}

func chatImageRefsToJSONMap(refs []schemas.ChatTestImageRef) models.JSONMap {
	items := make([]any, 0, len(refs))
	for _, ref := range refs {
		url := strings.TrimSpace(ref.URL)
		if url == "" {
			continue
		}
		items = append(items, map[string]any{
			"name": strings.TrimSpace(ref.Name),
			"url":  url,
		})
	}
	if len(items) == 0 {
		return models.JSONMap{"items": []any{}}
	}
	return models.JSONMap{"items": items}
}

func chatImageRefsFromJSONMap(value models.JSONMap) []schemas.ChatTestImageRef {
	if value == nil {
		return []schemas.ChatTestImageRef{}
	}
	raw, ok := value["items"]
	if !ok || raw == nil {
		return []schemas.ChatTestImageRef{}
	}
	out := []schemas.ChatTestImageRef{}
	switch items := raw.(type) {
	case []any:
		for _, item := range items {
			if obj, ok := item.(map[string]any); ok {
				ref := schemas.ChatTestImageRef{
					Name: strings.TrimSpace(fmt.Sprint(obj["name"])),
					URL:  strings.TrimSpace(fmt.Sprint(obj["url"])),
				}
				if ref.URL != "" {
					out = append(out, ref)
				}
			}
		}
	case []map[string]any:
		for _, obj := range items {
			ref := schemas.ChatTestImageRef{
				Name: strings.TrimSpace(fmt.Sprint(obj["name"])),
				URL:  strings.TrimSpace(fmt.Sprint(obj["url"])),
			}
			if ref.URL != "" {
				out = append(out, ref)
			}
		}
	}
	return out
}

func shortenChatSessionText(value string, limit int) string {
	value = strings.Join(strings.Fields(strings.TrimSpace(value)), " ")
	if limit <= 0 || len(value) <= limit {
		return value
	}
	runes := []rune(value)
	if len(runes) <= limit {
		return value
	}
	if limit <= 3 {
		return string(runes[:limit])
	}
	return string(runes[:limit-3]) + "..."
}

func chatSessionQueryInt(r *http.Request, key string, fallback, min, max int) int {
	raw := strings.TrimSpace(r.URL.Query().Get(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return clampInt(value, min, max, fallback)
}

func (a *App) ModelList(w http.ResponseWriter, r *http.Request) {
	var payload schemas.ModelListRequest
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	site, ok := a.toolSite(w, payload.SiteID)
	if !ok {
		return
	}
	candidates := toolModelCandidates(site)
	if len(candidates) == 0 {
		writeJSON(w, http.StatusOK, schemas.ModelListResponse{OK: false, Message: "站点没有可用 API Key 或请求 API URL", Models: []string{}, Items: []schemas.ModelListItem{}})
		return
	}
	var last upstreamResult
	var authFailure *upstreamResult
	items := []schemas.ModelListItem{}
	for _, candidate := range candidates {
		result := openAIGet(r, candidate.BaseURL, candidate.APIKey, modelListPath(candidate.RouteType), 25*time.Second, candidate.RouteType)
		last = result
		if isUpstreamAuthFailure(result) && authFailure == nil {
			copied := result
			authFailure = &copied
		}
		for _, modelID := range extractModelIDs(result.data) {
			items = append(items, schemas.ModelListItem{
				ID:             modelID,
				RouteType:      candidate.RouteType,
				Mode:           inferChatMode(modelID),
				BaseURL:        candidate.BaseURL,
				KeyFingerprint: candidate.KeyFingerprint,
				KeyName:        candidate.KeyName,
				ImageGenPath:   candidate.ImageGenPath,
				ImageEditPath:  candidate.ImageEditPath,
			})
		}
	}
	items = normalizeModelItems(items)
	modelIDs := make([]string, 0, len(items))
	for _, item := range items {
		modelIDs = append(modelIDs, item.ID)
	}
	message := "模型列表已加载。"
	if len(items) == 0 {
		if authFailure != nil {
			last = *authFailure
		}
		message = "未获取到模型列表。"
		if !last.ok && strings.TrimSpace(last.message) != "" {
			message = last.message
		}
		if last.statusCode != nil && *last.statusCode == http.StatusNotFound {
			message = fmt.Sprintf("%s 请检查站点的 API 请求 URL 是否是模型请求根地址，或该上游是否支持 /models。", message)
		}
	}
	response := schemas.ModelListResponse{OK: len(items) > 0, Message: message, Models: modelIDs, Items: items}
	if last.statusCode != nil {
		response.StatusCode = last.statusCode
		response.LatencyMS = last.latencyMS
	}
	if len(candidates) > 0 {
		response.BaseURL = candidates[0].BaseURL
		response.RouteType = candidates[0].RouteType
		response.KeyFingerprint = candidates[0].KeyFingerprint
		response.KeyName = candidates[0].KeyName
	}
	writeJSON(w, http.StatusOK, response)
}

func (a *App) ChatTest(w http.ResponseWriter, r *http.Request) {
	var payload schemas.ChatTestRequest
	if err := httpx.Decode(r, &payload); err != nil {
		writeError(w, http.StatusBadRequest, "请求格式错误")
		return
	}
	if err := a.resolveChatTarget(w, &payload); err != nil {
		return
	}
	mode := strings.ToLower(strings.TrimSpace(payload.Mode))
	if mode == "" || mode == "auto" {
		mode = inferChatMode(payload.Model)
	}
	if mode == "image" {
		a.chatImageTest(w, r, payload)
		return
	}
	messages := buildChatCompletionMessages(payload)
	path := "/chat/completions"
	body := map[string]any{"model": payload.Model, "messages": messages, "temperature": 0.2}
	if toolNormalizeRouteType(payload.RouteType) == "codex" {
		path = "/responses"
		body = map[string]any{"model": payload.Model, "input": chatMessagesToResponsesInput(messages), "temperature": 0.2}
	}
	result := openAIPost(r, payload.BaseURL, payload.APIKey, path, body, 30*time.Second, payload.RouteType)
	output := ""
	if result.data != nil {
		output = extractChatOutput(result.data)
	}
	message := "测试完成。"
	if !result.ok {
		message = result.message
	}
	writeJSON(w, http.StatusOK, schemas.ChatTestResponse{OK: result.ok, StatusCode: result.statusCode, LatencyMS: result.latencyMS, Message: message, Output: output})
}

func (a *App) chatImageTest(w http.ResponseWriter, r *http.Request, payload schemas.ChatTestRequest) {
	prompt := strings.TrimSpace(payload.Prompt)
	if prompt == "" && len(payload.Messages) > 0 {
		prompt = strings.TrimSpace(payload.Messages[len(payload.Messages)-1].Content)
	}
	if prompt == "" {
		writeError(w, http.StatusBadRequest, "请输入图片生成提示词")
		return
	}
	imageSize := strings.TrimSpace(payload.ImageSize)
	if imageSize == "" {
		imageSize = "1024x1024"
	}
	if len(payload.ReferenceImgs) > 5 {
		writeError(w, http.StatusBadRequest, "参考图最多 5 张")
		return
	}
	var result upstreamResult
	if len(payload.ReferenceImgs) > 0 {
		result = openAIImageEditPost(r, payload.BaseURL, payload.APIKey, chatImageEditPath(payload), payload.Model, prompt, imageSize, payload.ReferenceImgs, 120*time.Second, payload.RouteType)
	} else {
		body := map[string]any{"model": payload.Model, "prompt": prompt, "n": 1, "size": imageSize, "quality": "auto"}
		result = openAIPost(r, payload.BaseURL, payload.APIKey, chatImageGenerationPath(payload), body, 120*time.Second, payload.RouteType)
	}
	images := []schemas.ChatTestImageOutput{}
	revisedPrompt := ""
	if result.data != nil {
		images, revisedPrompt = extractImageOutputs(result.data)
	}
	message := "图片生成完成。"
	if !result.ok {
		message = result.message
	}
	writeJSON(w, http.StatusOK, schemas.ChatTestResponse{OK: result.ok, StatusCode: result.statusCode, LatencyMS: result.latencyMS, Message: message, Images: images, RevisedPrompt: revisedPrompt})
}

func buildChatCompletionMessages(payload schemas.ChatTestRequest) []map[string]any {
	source := payload.Messages
	if len(source) == 0 {
		source = []schemas.ChatTestMessage{{Role: "user", Content: payload.Prompt, ReferenceImages: payload.ReferenceImgs}}
	}
	out := make([]map[string]any, 0, len(source))
	for _, item := range source {
		role := strings.TrimSpace(item.Role)
		if role != "assistant" && role != "system" && role != "user" {
			role = "user"
		}
		text := strings.TrimSpace(item.Content)
		if len(item.ReferenceImages) == 0 {
			out = append(out, map[string]any{"role": role, "content": text})
			continue
		}
		parts := []map[string]any{}
		if text != "" {
			parts = append(parts, map[string]any{"type": "text", "text": text})
		}
		for _, image := range item.ReferenceImages {
			if strings.TrimSpace(image.URL) == "" {
				continue
			}
			parts = append(parts, map[string]any{"type": "image_url", "image_url": map[string]any{"url": image.URL}})
		}
		if len(parts) == 0 {
			continue
		}
		out = append(out, map[string]any{"role": role, "content": parts})
	}
	if len(out) == 0 {
		out = append(out, map[string]any{"role": "user", "content": payload.Prompt})
	}
	return out
}

func extractChatOutput(data map[string]any) string {
	if text, ok := data["output_text"].(string); ok && strings.TrimSpace(text) != "" {
		return text
	}
	if output, ok := data["output"].([]any); ok {
		parts := []string{}
		for _, item := range output {
			obj, ok := item.(map[string]any)
			if !ok {
				continue
			}
			content, ok := obj["content"].([]any)
			if !ok {
				continue
			}
			for _, part := range content {
				partObj, ok := part.(map[string]any)
				if !ok {
					continue
				}
				if text, ok := partObj["text"].(string); ok && strings.TrimSpace(text) != "" {
					parts = append(parts, text)
				}
			}
		}
		if len(parts) > 0 {
			return strings.Join(parts, "\n")
		}
	}
	if choices, ok := data["choices"].([]any); ok && len(choices) > 0 {
		if choice, ok := choices[0].(map[string]any); ok {
			if message, ok := choice["message"].(map[string]any); ok {
				switch content := message["content"].(type) {
				case string:
					return content
				case []any:
					parts := []string{}
					for _, part := range content {
						if obj, ok := part.(map[string]any); ok {
							if text, ok := obj["text"].(string); ok && text != "" {
								parts = append(parts, text)
							}
						}
					}
					return strings.Join(parts, "\n")
				}
			}
		}
	}
	return ""
}

func chatMessagesToResponsesInput(messages []map[string]any) []map[string]any {
	out := make([]map[string]any, 0, len(messages))
	for _, message := range messages {
		role := strings.TrimSpace(fmt.Sprint(message["role"]))
		if role != "assistant" && role != "system" && role != "user" {
			role = "user"
		}
		out = append(out, map[string]any{
			"role":    role,
			"content": message["content"],
		})
	}
	return out
}

func extractImageOutputs(data map[string]any) ([]schemas.ChatTestImageOutput, string) {
	items, _ := data["data"].([]any)
	images := make([]schemas.ChatTestImageOutput, 0, len(items))
	revisedPrompt := ""
	for _, item := range items {
		obj, ok := item.(map[string]any)
		if !ok {
			continue
		}
		image := schemas.ChatTestImageOutput{}
		image.URL, _ = obj["url"].(string)
		image.B64JSON, _ = obj["b64_json"].(string)
		image.RevisedPrompt, _ = obj["revised_prompt"].(string)
		if revisedPrompt == "" {
			revisedPrompt = image.RevisedPrompt
		}
		if image.URL != "" || image.B64JSON != "" {
			images = append(images, image)
		}
	}
	return images, revisedPrompt
}

func chatImageGenerationPath(payload schemas.ChatTestRequest) string {
	return firstNonEmpty(chatImagePathFromConfig(models.JSONMap{"path": payload.ImageGenPath}, "path"), "/images/generations")
}

func chatImageEditPath(payload schemas.ChatTestRequest) string {
	return firstNonEmpty(chatImagePathFromConfig(models.JSONMap{"path": payload.ImageEditPath}, "path"), "/images/edits")
}

func chatImagePathFromConfig(config models.JSONMap, key string) string {
	value := strings.TrimSpace(jsonMapString(config, key))
	if value == "" {
		return ""
	}
	if strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "https://") {
		return value
	}
	if !strings.HasPrefix(value, "/") {
		value = "/" + value
	}
	return value
}

type upstreamResult struct {
	ok         bool
	statusCode *int
	latencyMS  *float64
	message    string
	data       map[string]any
}

type toolModelCandidate struct {
	BaseURL        string
	APIKey         string
	RouteType      string
	KeyFingerprint string
	KeyName        string
	ImageGenPath   string
	ImageEditPath  string
}

type toolSiteKey struct {
	Value           string
	Fingerprint     string
	Name            string
	RouteType       string
	RequestBaseURLs []string
	ImageGenPath    string
	ImageEditPath   string
}

func (a *App) toolSite(w http.ResponseWriter, siteID uint) (models.Site, bool) {
	if siteID == 0 {
		writeError(w, http.StatusBadRequest, "请选择站点")
		return models.Site{}, false
	}
	var site models.Site
	if err := a.DB.First(&site, siteID).Error; err != nil {
		writeError(w, http.StatusNotFound, "站点不存在")
		return models.Site{}, false
	}
	return site, true
}

func (a *App) resolveChatTarget(w http.ResponseWriter, payload *schemas.ChatTestRequest) error {
	if payload.SiteID == 0 {
		if strings.TrimSpace(payload.BaseURL) == "" || strings.TrimSpace(payload.APIKey) == "" {
			writeError(w, http.StatusBadRequest, "请选择站点")
			return fmt.Errorf("site required")
		}
		return nil
	}
	site, ok := a.toolSite(w, payload.SiteID)
	if !ok {
		return fmt.Errorf("site not found")
	}
	candidate, ok := pickToolModelCandidate(site, payload.KeyFingerprint, payload.RouteType)
	if !ok {
		writeError(w, http.StatusBadRequest, "站点没有匹配的 API Key 或请求 API URL")
		return fmt.Errorf("candidate not found")
	}
	payload.BaseURL = candidate.BaseURL
	payload.APIKey = candidate.APIKey
	payload.RouteType = candidate.RouteType
	payload.ImageGenPath = firstNonEmpty(payload.ImageGenPath, candidate.ImageGenPath, chatImagePathFromConfig(site.PluginConfig, "image_generation_path"))
	payload.ImageEditPath = firstNonEmpty(payload.ImageEditPath, candidate.ImageEditPath, chatImagePathFromConfig(site.PluginConfig, "image_edit_path"))
	return nil
}

func openAIGet(r *http.Request, baseURL, apiKey, path string, timeout time.Duration, routeType ...string) upstreamResult {
	return openAIRequest(r, http.MethodGet, baseURL, apiKey, path, nil, timeout, routeType...)
}

func openAIPost(r *http.Request, baseURL, apiKey, path string, body any, timeout time.Duration, routeType ...string) upstreamResult {
	data, _ := json.Marshal(body)
	return openAIRequest(r, http.MethodPost, baseURL, apiKey, path, bytes.NewReader(data), timeout, routeType...)
}

func openAIImageEditPost(r *http.Request, baseURL, apiKey, path, model, prompt, size string, images []schemas.ChatTestImageRef, timeout time.Duration, routeType ...string) upstreamResult {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	_ = writer.WriteField("model", model)
	_ = writer.WriteField("prompt", prompt)
	_ = writer.WriteField("n", "1")
	if size != "" {
		_ = writer.WriteField("size", size)
	}
	_ = writer.WriteField("quality", "auto")
	for idx, image := range images {
		raw, contentType, err := decodeDataImage(image.URL)
		if err != nil {
			return upstreamResult{message: err.Error()}
		}
		name := strings.TrimSpace(image.Name)
		if name == "" {
			name = fmt.Sprintf("reference-%d.png", idx+1)
		}
		header := make(textproto.MIMEHeader)
		header.Set("Content-Disposition", fmt.Sprintf(`form-data; name="image"; filename="%s"`, escapeMultipartFilename(name)))
		header.Set("Content-Type", contentType)
		part, err := writer.CreatePart(header)
		if err != nil {
			return upstreamResult{message: "图片请求构造失败：" + err.Error()}
		}
		if _, err := part.Write(raw); err != nil {
			return upstreamResult{message: "图片写入失败：" + err.Error()}
		}
	}
	if err := writer.Close(); err != nil {
		return upstreamResult{message: "图片请求收尾失败：" + err.Error()}
	}
	return openAIRequestWithHeaders(r, http.MethodPost, baseURL, apiKey, firstNonEmpty(path, "/images/edits"), bytes.NewReader(body.Bytes()), timeout, map[string]string{"Content-Type": writer.FormDataContentType()}, routeType...)
}

func openAIRequest(r *http.Request, method, baseURL, apiKey, path string, body io.Reader, timeout time.Duration, routeType ...string) upstreamResult {
	return openAIRequestWithHeaders(r, method, baseURL, apiKey, path, body, timeout, nil, routeType...)
}

func openAIRequestWithHeaders(r *http.Request, method, baseURL, apiKey, path string, body io.Reader, timeout time.Duration, extraHeaders map[string]string, routeType ...string) upstreamResult {
	start := time.Now()
	rt := ""
	if len(routeType) > 0 {
		rt = routeType[0]
	}
	target, err := services.GatewayTargetURL(baseURL, path, "", rt)
	if err != nil {
		return upstreamResult{message: "请求地址构造失败：" + err.Error()}
	}
	req, err := http.NewRequestWithContext(r.Context(), method, target, body)
	if err != nil {
		return upstreamResult{message: "请求构造失败：" + err.Error()}
	}
	for key, value := range services.BuildBrowserHeaders(baseURL, body != nil, bearer(apiKey), "", toolAPIKeyHeaders(apiKey)) {
		req.Header.Set(key, value)
	}
	for key, value := range extraHeaders {
		req.Header.Set(key, value)
	}
	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	latency := float64(time.Since(start).Microseconds()) / 1000
	if err != nil {
		return upstreamResult{latencyMS: &latency, message: "请求失败：" + err.Error()}
	}
	defer resp.Body.Close()
	status := resp.StatusCode
	raw, _ := io.ReadAll(io.LimitReader(resp.Body, 64<<20))
	var data map[string]any
	_ = json.Unmarshal(raw, &data)
	ok := status >= 200 && status < 300
	message := "接口返回 " + http.StatusText(status)
	if !ok {
		message = "接口返回 " + http.StatusText(status)
		if len(raw) > 0 {
			message = "接口返回 " + string(raw)
			if len(message) > 300 {
				message = message[:300] + "..."
			}
		}
		if strings.Contains(strings.ToUpper(message), "API_KEY_REQUIRED") {
			message = message + "。上游提示未收到 API Key，请确认该站点保存了 api_key，且模型请求应使用 Authorization: Bearer、x-api-key 或 x-goog-api-key。"
		}
	}
	return upstreamResult{ok: ok, statusCode: &status, latencyMS: &latency, message: message, data: data}
}

func toolModelCandidates(site models.Site) []toolModelCandidate {
	keys := toolSiteAPIKeys(site)
	candidates := []toolModelCandidate{}
	for _, key := range keys {
		routeType := firstNonEmpty(key.RouteType, toolInferRouteType(site), "codex")
		baseURLs := key.RequestBaseURLs
		if len(baseURLs) == 0 {
			baseURLs = services.GatewayRequestBaseCandidates(site)
		}
		if len(baseURLs) == 0 {
			baseURLs = []string{services.NormalizeBaseURL(site.BaseURL)}
		}
		baseURLs = normalizeToolStringList(baseURLs)
		for _, baseURL := range baseURLs {
			candidates = append(candidates, toolModelCandidate{
				BaseURL:        baseURL,
				APIKey:         key.Value,
				RouteType:      routeType,
				KeyFingerprint: key.Fingerprint,
				KeyName:        key.Name,
				ImageGenPath:   key.ImageGenPath,
				ImageEditPath:  key.ImageEditPath,
			})
		}
	}
	return candidates
}

func pickToolModelCandidate(site models.Site, keyFingerprint, routeType string) (toolModelCandidate, bool) {
	candidates := toolModelCandidates(site)
	if len(candidates) == 0 {
		return toolModelCandidate{}, false
	}
	keyFingerprint = strings.TrimSpace(keyFingerprint)
	routeType = toolNormalizeRouteType(routeType)
	for _, candidate := range candidates {
		if keyFingerprint != "" && candidate.KeyFingerprint != keyFingerprint {
			continue
		}
		if routeType != "" && candidate.RouteType != routeType {
			continue
		}
		return candidate, true
	}
	return candidates[0], true
}

func toolSiteAPIKeys(site models.Site) []toolSiteKey {
	keys := []toolSiteKey{}
	if rawKeys, ok := site.Credentials["api_keys"].([]any); ok {
		for _, item := range rawKeys {
			obj, ok := item.(map[string]any)
			if !ok {
				continue
			}
			value := strings.TrimSpace(fmt.Sprint(obj["key"]))
			status := strings.ToLower(strings.TrimSpace(fmt.Sprint(obj["status"])))
			if value == "" || status == "disabled" || status == "inactive" || status == "revoked" {
				continue
			}
			routeType := toolNormalizeRouteType(firstNonEmpty(fmt.Sprint(obj["route_type"]), fmt.Sprint(obj["api_type"]), fmt.Sprint(obj["api_format"]), fmt.Sprint(obj["type"])))
			keys = append(keys, toolSiteKey{
				Value:           value,
				Name:            strings.TrimSpace(fmt.Sprint(obj["name"])),
				RouteType:       routeType,
				RequestBaseURLs: toolAPIKeyRequestBaseURLs(site, obj),
				ImageGenPath:    chatImagePathFromMap(obj, "image_generation_path"),
				ImageEditPath:   chatImagePathFromMap(obj, "image_edit_path"),
			})
		}
	}
	value := strings.TrimSpace(jsonMapString(site.Credentials, "api_key"))
	if value != "" && len(keys) == 0 {
		keys = append(keys, toolSiteKey{Value: value, Fingerprint: toolFingerprint(value), Name: "默认 Key", RouteType: toolInferRouteType(site)})
	}
	assignToolSiteKeyFingerprints(keys)
	return keys
}

func assignToolSiteKeyFingerprints(keys []toolSiteKey) {
	byValue := map[string]int{}
	for _, key := range keys {
		byValue[key.Value]++
	}
	seen := map[string]int{}
	for idx := range keys {
		if byValue[keys[idx].Value] <= 1 {
			keys[idx].Fingerprint = toolFingerprint(keys[idx].Value)
			continue
		}
		signature := strings.Join([]string{
			toolNormalizeRouteType(keys[idx].RouteType),
			strings.Join(normalizeToolStringList(keys[idx].RequestBaseURLs), ","),
			strings.TrimSpace(keys[idx].ImageGenPath),
			strings.TrimSpace(keys[idx].ImageEditPath),
			strings.TrimSpace(keys[idx].Name),
		}, "\x00")
		fp := toolFingerprint(keys[idx].Value + "\x00" + signature)
		seen[fp]++
		if seen[fp] > 1 {
			fp = toolFingerprint(keys[idx].Value + "\x00" + signature + "\x00" + strconv.Itoa(seen[fp]))
		}
		keys[idx].Fingerprint = fp
	}
}

func toolAPIKeyRequestBaseURLs(site models.Site, obj map[string]any) []string {
	raw := []string{}
	for _, field := range []string{
		"request_base_urls",
		"request_base_url",
		"api_request_urls",
		"api_request_url",
		"gateway_request_urls",
		"gateway_request_url",
		"endpoint_url",
		"base_url",
		"baseURL",
		"api_base_url",
		"apiBaseUrl",
		"api_url",
		"apiUrl",
	} {
		raw = append(raw, stringListFromAny(obj[field])...)
	}
	out := []string{}
	for _, target := range raw {
		target = strings.TrimSpace(target)
		if target == "" {
			continue
		}
		joined := target
		if value, err := services.JoinURL(site.BaseURL, target); err == nil && value != "" {
			joined = value
		}
		joined = services.NormalizeBaseURL(joined)
		if joined == "" || containsToolString(out, joined) {
			continue
		}
		out = append(out, joined)
	}
	return out
}

func stringListFromAny(value any) []string {
	switch typed := value.(type) {
	case []string:
		return normalizeToolStringList(typed)
	case []any:
		items := make([]string, 0, len(typed))
		for _, item := range typed {
			items = append(items, fmt.Sprint(item))
		}
		return normalizeToolStringList(items)
	case string:
		return normalizeToolStringList(strings.FieldsFunc(typed, func(r rune) bool {
			return strings.ContainsRune(",，\n\r\t", r)
		}))
	default:
		if value == nil {
			return nil
		}
		return normalizeToolStringList([]string{fmt.Sprint(value)})
	}
}

func chatImagePathFromMap(obj map[string]any, key string) string {
	if obj == nil {
		return ""
	}
	value := strings.TrimSpace(fmt.Sprint(obj[key]))
	if value == "" || value == "<nil>" {
		return ""
	}
	if strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "https://") {
		return value
	}
	return strings.TrimLeft(value, "/")
}

func toolInferRouteType(site models.Site) string {
	return firstNonEmpty(
		toolNormalizeRouteType(jsonMapString(site.PluginConfig, "gateway_route_type")),
		toolNormalizeRouteType(jsonMapString(site.PluginConfig, "api_format")),
		"gpt",
	)
}

func toolNormalizeRouteType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "general", "auto", "any", "none", "default":
		return "general"
	case "claude", "anthropic":
		return "claude"
	case "gemini", "google":
		return "gemini"
	case "gpt", "openai", "chatgpt", "chat", "chat_completions", "chat-completions":
		return "gpt"
	case "codex", "response", "responses":
		return "codex"
	default:
		return ""
	}
}

func modelListPath(routeType string) string {
	switch toolNormalizeRouteType(routeType) {
	case "claude":
		return "/models"
	default:
		return "/models"
	}
}

func extractModelIDs(data map[string]any) []string {
	if data == nil {
		return nil
	}
	var rawItems []any
	if items, ok := data["data"].([]any); ok {
		rawItems = items
	} else if items, ok := data["models"].([]any); ok {
		rawItems = items
	} else {
		return nil
	}
	out := make([]string, 0, len(rawItems))
	for _, item := range rawItems {
		switch typed := item.(type) {
		case string:
			out = append(out, typed)
		case map[string]any:
			for _, key := range []string{"id", "name", "model"} {
				value := strings.TrimSpace(fmt.Sprint(typed[key]))
				if value != "" && value != "<nil>" {
					out = append(out, value)
					break
				}
			}
		}
	}
	return out
}

func normalizeModelItems(items []schemas.ModelListItem) []schemas.ModelListItem {
	seen := map[string]bool{}
	out := make([]schemas.ModelListItem, 0, len(items))
	for _, item := range items {
		item.ID = strings.TrimSpace(item.ID)
		if item.ID == "" || item.ID == "<nil>" {
			continue
		}
		key := item.ID + "\x00" + item.RouteType + "\x00" + item.KeyFingerprint + "\x00" + item.BaseURL + "\x00" + item.ImageGenPath + "\x00" + item.ImageEditPath
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, item)
	}
	sort.SliceStable(out, func(i, j int) bool {
		return out[i].ID < out[j].ID
	})
	return out
}

func inferChatMode(model string) string {
	normalized := strings.ToLower(strings.TrimSpace(model))
	if strings.Contains(normalized, "gpt-image") ||
		strings.Contains(normalized, "dall-e") ||
		strings.Contains(normalized, "image-generation") ||
		strings.Contains(normalized, "image_generation") ||
		strings.Contains(normalized, "imagen") {
		return "image"
	}
	return "chat"
}

func normalizeToolStringList(values []string) []string {
	out := []string{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" || containsToolString(out, value) {
			continue
		}
		out = append(out, value)
	}
	return out
}

func containsToolString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func toolFingerprint(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])[:16]
}

func toolAPIKeyHeaders(apiKey string) map[string]string {
	apiKey = strings.TrimSpace(apiKey)
	if apiKey == "" {
		return nil
	}
	value := strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(apiKey, "Bearer "), "bearer "))
	if value == "" {
		return nil
	}
	return map[string]string{
		"x-api-key":      value,
		"x-goog-api-key": value,
	}
}

func isUpstreamAuthFailure(result upstreamResult) bool {
	if result.statusCode != nil && (*result.statusCode == http.StatusUnauthorized || *result.statusCode == http.StatusForbidden) {
		return true
	}
	upper := strings.ToUpper(result.message)
	return strings.Contains(upper, "API_KEY_REQUIRED") || strings.Contains(upper, "INVALID_API_KEY")
}

func decodeDataImage(value string) ([]byte, string, error) {
	if !strings.HasPrefix(value, "data:image/") {
		return nil, "", fmt.Errorf("参考图必须是 data:image/* base64 数据")
	}
	header, encoded, ok := strings.Cut(value, ",")
	if !ok {
		return nil, "", fmt.Errorf("参考图数据格式不正确")
	}
	contentType := strings.TrimPrefix(strings.TrimSpace(header), "data:")
	if semi := strings.Index(contentType, ";"); semi >= 0 {
		contentType = contentType[:semi]
	}
	if contentType == "" {
		contentType = "image/png"
	}
	raw, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, "", fmt.Errorf("参考图 base64 解码失败：%w", err)
	}
	return raw, contentType, nil
}

func escapeMultipartFilename(value string) string {
	return strings.NewReplacer("\\", "\\\\", `"`, "\\\"").Replace(value)
}

func bearer(apiKey string) string {
	if apiKey == "" {
		return ""
	}
	if len(apiKey) >= 7 && apiKey[:7] == "Bearer " {
		return apiKey
	}
	return "Bearer " + apiKey
}
