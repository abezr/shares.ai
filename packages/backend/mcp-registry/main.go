package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

type MCP struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Status string `json:"status"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func discoverHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("Discovery request received")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	mocks := []MCP{
		{ID: "aws-infra-v2.1", Name: "Mock AWS MCP", Status: "available"},
		{ID: "k8s-converter-v3.1", Name: "Mock K8s Converter", Status: "available"},
	}
	_ = json.NewEncoder(w).Encode(mocks)
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/discover", discoverHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("MCP Registry listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
