# Build the React production bundle.
FROM node:22-alpine AS build
WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Serve the bundle and proxy API requests to the backend.
FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
