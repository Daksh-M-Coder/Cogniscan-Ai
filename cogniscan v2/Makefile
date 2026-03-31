.PHONY: help install backend-dev mobile-dev docker-up docker-down test lint

help:
	@echo "CogniScan AI - Available Commands"
	@echo "================================"
	@echo "make docker-up      - Start Docker infrastructure"
	@echo "make docker-down    - Stop Docker infrastructure"
	@echo "make backend-dev    - Run backend services locally"
	@echo "make mobile-dev     - Run mobile app in development"
	@echo "make ml-train       - Run ML training pipeline"
	@echo "make test           - Run all tests"
	@echo "make lint           - Run linters"

docker-up:
	docker-compose -f infrastructure/docker/docker-compose.yml up -d

docker-down:
	docker-compose -f infrastructure/docker/docker-compose.yml down

backend-dev:
	cd backend && docker-compose up -d postgres redis
	cd backend/user-service && npm run dev &
	cd backend/assessment-service && uvicorn main:app --reload --port 8000 &
	cd backend/ml-service && uvicorn main:app --reload --port 8001 &

mobile-dev:
	cd mobile-app && npx expo start

ml-train:
	cd ml-pipeline && python -m training.train_all

test:
	cd backend && pytest
	cd mobile-app && npm test
	cd ml-pipeline && pytest

lint:
	cd backend && black . && isort . && flake8
	cd mobile-app && eslint . --fix
	cd ml-pipeline && black . && isort .

setup:
	@echo "Setting up CogniScan AI development environment..."
	cd backend/user-service && npm install
	cd backend/notification-service && npm install
	cd backend/assessment-service && pip install -r requirements.txt
	cd backend/ml-service && pip install -r requirements.txt
	cd ml-pipeline && pip install -r requirements.txt
	cd mobile-app && npm install
	@echo "Setup complete! Run 'make docker-up' to start infrastructure."
