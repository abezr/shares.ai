package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nats-io/nats.go"
)

type ServiceProfileCreatedEvent struct {
	EventID   string    `json:"eventId"`
	Timestamp time.Time `json:"timestamp"`
	EventType string    `json:"eventType"`
	Data      struct {
		ServiceProfileID string                 `json:"serviceProfileId"`
		Name             string                 `json:"name"`
		Goals            map[string]any         `json:"goals"`
		SourceContent    *string                `json:"source_content"`
		TargetProvider   *string                `json:"target_provider"`
	} `json:"data"`
}

type EchoTaskEvent struct {
	EventID   string `json:"eventId"`
	EventType string `json:"eventType"`
	RunID     string `json:"runId"`
	Message   string `json:"message"`
}

type ConversionTaskEvent struct {
	EventID        string `json:"eventId"`
	EventType      string `json:"eventType"`
	RunID          string `json:"runId"`
	SourceContent  string `json:"sourceContent"`
	TargetProvider string `json:"targetProvider"`
}

func main() {
	pgURL := getenv("POSTGRES_URL", "postgres://aether:aether@localhost:5432/aether_meta")
	natsURL := getenv("NATS_URL", "nats://localhost:4222")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	pool, err := pgxpool.New(ctx, pgURL)
	if err != nil {
		log.Fatalf("failed to create pg pool: %v", err)
	}
	defer pool.Close()
	log.Printf("Connected to Postgres")

	nc, err := nats.Connect(natsURL, nats.Name("orchestrator"))
	if err != nil {
		log.Fatalf("failed to connect to NATS: %v", err)
	}
	defer nc.Drain()
	log.Printf("Connected to NATS at %s", natsURL)

	queue := "orchestrator-workers"
	subject := "aether.tasks.new"
	sub, err := nc.QueueSubscribe(subject, queue, func(msg *nats.Msg) {
		var evt ServiceProfileCreatedEvent
		if err := json.Unmarshal(msg.Data, &evt); err != nil {
			log.Printf("invalid event payload: %v", err)
			return
		}
		log.Printf("Received new task for service profile: %s", evt.Data.ServiceProfileID)

		// Insert run_ledger entry
		dbCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		var runID string
		query := `INSERT INTO run_ledger(service_profile_id, status, steps) VALUES ($1, $2, $3) RETURNING id`
		steps := `[]`
		if err := pool.QueryRow(dbCtx, query, evt.Data.ServiceProfileID, "pending", []byte(steps)).Scan(&runID); err != nil {
			log.Printf("failed to insert run_ledger: %v", err)
			return
		}

		// Conditional dispatch: ConversionTask when source and target provided; else EchoTask
		if evt.Data.SourceContent != nil && evt.Data.TargetProvider != nil &&
			strings.TrimSpace(*evt.Data.SourceContent) != "" && strings.TrimSpace(*evt.Data.TargetProvider) != "" {
			conv := ConversionTaskEvent{
				EventID:        uuid.New().String(),
				EventType:      "ConversionTask",
				RunID:          runID,
				SourceContent:  *evt.Data.SourceContent,
				TargetProvider: *evt.Data.TargetProvider,
			}
			payload, _ := json.Marshal(conv)
			if err := nc.Publish("aether.agent.tasks", payload); err != nil {
				log.Printf("failed to publish ConversionTask: %v", err)
				return
			}
			log.Printf("Published ConversionTask for run: %s", runID)
		} else {
			echo := EchoTaskEvent{
				EventID:   uuid.New().String(),
				EventType: "EchoTask",
				RunID:     runID,
				Message:   "Hello Agent, please process this task.",
			}
			payload, _ := json.Marshal(echo)
			if err := nc.Publish("aether.agent.tasks", payload); err != nil {
				log.Printf("failed to publish EchoTask: %v", err)
				return
			}
			log.Printf("Published EchoTask for run: %s", runID)
		}
	})
	if err != nil {
		log.Fatalf("failed to subscribe: %v", err)
	}

	// Ensure subscription is active before proceeding
	if err := nc.Flush(); err != nil {
		log.Fatalf("failed to flush NATS connection: %v", err)
	}
	log.Printf("Subscribed to %s with queue %s", subject, queue)

	// Graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh
	log.Printf("Shutting down orchestrator...")
	_ = sub.Drain()
}

func getenv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
