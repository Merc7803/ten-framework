package internal

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"reflect"
	"strconv"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestBuildTextWorkerUpdateReqUsesFinalAsrResultData(t *testing.T) {
	req := TextReq{
		RequestId:   "request-1",
		ChannelName: "test-channel",
		Text:        "  hello avatar  ",
	}

	got := buildTextWorkerUpdateReq(req)
	want := &WorkerUpdateReq{
		RequestId:   "request-1",
		ChannelName: "test-channel",
		Text:        "hello avatar",
		Final:       true,
		Ten: &WorkerUpdateReqTen{
			Name: "asr_result",
			Type: "data",
		},
	}

	if !reflect.DeepEqual(got, want) {
		t.Fatalf("buildTextWorkerUpdateReq() = %#v, want %#v", got, want)
	}
}

func TestHandlerTextForwardsFinalAsrResultToWorker(t *testing.T) {
	gin.SetMode(gin.TestMode)

	var forwarded WorkerUpdateReq
	workerServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/cmd" {
			t.Fatalf("worker path = %s, want /cmd", r.URL.Path)
		}
		if err := json.NewDecoder(r.Body).Decode(&forwarded); err != nil {
			t.Fatalf("decode worker body: %v", err)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer workerServer.Close()

	workerURL, err := url.Parse(workerServer.URL)
	if err != nil {
		t.Fatalf("parse worker url: %v", err)
	}
	port, err := strconv.Atoi(workerURL.Port())
	if err != nil {
		t.Fatalf("parse worker port: %v", err)
	}

	workers.Remove("test-channel")
	workers.Set("test-channel", &Worker{
		ChannelName:    "test-channel",
		HttpServerPort: int32(port),
	})
	defer workers.Remove("test-channel")

	router := gin.New()
	server := NewHttpServer(&HttpServerConfig{})
	router.POST("/text", server.handlerText)

	body := bytes.NewBufferString(`{"request_id":"request-1","channel_name":"test-channel","text":"  hello avatar  "}`)
	req := httptest.NewRequest(http.MethodPost, "/text", body)
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()

	router.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", resp.Code, resp.Body.String())
	}

	want := WorkerUpdateReq{
		RequestId:   "request-1",
		ChannelName: "test-channel",
		Text:        "hello avatar",
		Final:       true,
		Ten: &WorkerUpdateReqTen{
			Name: "asr_result",
			Type: "data",
		},
	}
	if !reflect.DeepEqual(forwarded, want) {
		t.Fatalf("forwarded = %#v, want %#v", forwarded, want)
	}
}
