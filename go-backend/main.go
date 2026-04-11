package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"time"
)

func contains(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), substr)
}

// TelemetryPayload mimics the hardware node response structure
type TelemetryPayload struct {
	Timestamp int64   `json:"timestamp"`
	NodeID    string  `json:"node_id"`
	Status    string  `json:"status"`
	Value     float64 `json:"value"`
	Safe      bool    `json:"safe"`
}

func main() {
	mux := http.NewServeMux()

	// High-speed API endpoint mimicking inference / FleetSafe validation
	mux.HandleFunc("/api/validate", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		time.Sleep(200 * time.Millisecond) // Simulation lag

		// Deterministic Mock Response
		response := map[string]interface{}{
			"approved": true,
			"results": []map[string]interface{}{
				{"ok": true, "w": "L1: Bounds Checked"},
				{"ok": true, "w": "L2: Neural Interlock Verified"},
				{"ok": true, "w": "L3: Permissive Flow Authenticated"},
				{"ok": true, "w": "L4: OEE Targets Predicted"},
				{"ok": true, "w": "L5: Deployment Ready"},
			},
		}

		json.NewEncoder(w).Encode(response)
	})

	// Low latency Telemetry websocket placeholder mapped as GET for simplicity
	mux.HandleFunc("/api/telemetry", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")

		payload := TelemetryPayload{
			Timestamp: time.Now().UnixMilli(),
			NodeID:    "NEXUS_EDGE_" + fmt.Sprint(rand.Intn(10)+1),
			Status:    "OPTIMAL",
			Value:     12.0 + (rand.Float64() * 2),
			Safe:      true,
		}

		json.NewEncoder(w).Encode(payload)
	})

	// Natural Language Command Intelligence Parser
	mux.HandleFunc("/api/command", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Content-Type", "application/json")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		var req struct {
			Prompt string `json:"prompt"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		time.Sleep(300 * time.Millisecond) // Simulated compute latency

		// Regex-equivalent simple routing
		action := "LIST_ALL"
		switch {
		case contains(req.Prompt, "sandbox"), contains(req.Prompt, "hardware"):
			action = "HARDWARE_SANDBOX"
		case contains(req.Prompt, "ladder"), contains(req.Prompt, "logic"):
			action = "LADDER_EDITOR"
		case contains(req.Prompt, "safety"), contains(req.Prompt, "fleet"):
			action = "SAFETY_DASHBOARD"
		case contains(req.Prompt, "twin"), contains(req.Prompt, "digital"):
			action = "DIGITAL_TWIN process_18"
		case contains(req.Prompt, "vision"):
			action = "VISION"
		case contains(req.Prompt, "wizard"), contains(req.Prompt, "project"):
			action = "WIZARD"
		}

		json.NewEncoder(w).Encode(map[string]string{
			"action": action,
		})
	})

	port := "3000"
	fmt.Printf("🚀 IntelliLogix High-Performance Compute Node [GO] running securely on port %s\n", port)
	if err := http.ListenAndServe("0.0.0.0:"+port, mux); err != nil {
		log.Fatalf("Critical Engine Failure: %v", err)
	}
}
