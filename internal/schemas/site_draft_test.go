package schemas

import (
	"encoding/json"
	"testing"
)

func TestSiteDraftTestRequestAcceptsSiteID(t *testing.T) {
	var payload SiteDraftTestRequest
	err := json.Unmarshal([]byte(`{"site_id":42,"name":"draft","base_url":"https://example.test","plugin_key":"newapi"}`), &payload)
	if err != nil {
		t.Fatalf("解码草稿请求失败：%v", err)
	}
	if payload.SiteID != 42 {
		t.Fatalf("站点 ID 应为 42，实际为 %d", payload.SiteID)
	}
	if payload.Name != "draft" || payload.PluginKey != "newapi" {
		t.Fatalf("草稿基础字段未正确解码：%#v", payload.SiteBase)
	}
}
