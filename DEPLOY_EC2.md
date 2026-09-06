# Deploy to AWS EC2

This project runs as three Docker services: the React frontend (Nginx), Spring Boot backend, and MySQL. Only the frontend is exposed publicly; it forwards `/api` and `/candidates_images` requests internally.

## 1. Prepare the EC2 instance

Use Ubuntu 22.04 or newer. In the EC2 security group, allow inbound TCP **22** from your own IP and **80** from the internet. Do not open 3306 or 8080.

SSH to the server, then install Docker:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER
exit
```

Reconnect for the Docker group change to apply.

## 2. Upload and configure

Clone your repository (or copy the project to the server) and enter it:

```bash
git clone YOUR_REPOSITORY_URL voting
cd voting
cp .env.example .env
nano .env
```

Set unique, long values for `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, and `DEFAULT_ADMIN_PASSWORD`. Add the Telegram token only if the application needs Telegram OTP.

## 3. Build and start

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f
```

Open `http://YOUR_EC2_PUBLIC_IP` in a browser. The first build can take several minutes.

## Updating the deployment

```bash
git pull
docker compose up -d --build
```

The `mysql_data` Docker volume retains the database, and the `candidates_images/` folder beside `docker-compose.yml` retains uploaded images. Both survive rebuilds and restarts. Do not run `docker compose down -v` unless you intentionally want to erase the database.

## HTTPS and a domain

For a real public voting site, put a TLS reverse proxy such as Caddy, Nginx, or an AWS Application Load Balancer in front of this stack. After HTTPS works, set `SESSION_COOKIE_SECURE=true` in `.env` and restart with `docker compose up -d`.
