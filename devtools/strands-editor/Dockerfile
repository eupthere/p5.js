FROM node:22-bookworm-slim AS build

WORKDIR /workspace/devtools/strands-editor

COPY devtools/strands-editor/package.json devtools/strands-editor/package-lock.json ./

RUN npm ci

COPY devtools/strands-editor/ ./
COPY lib /workspace/lib

RUN npm run build

FROM nginxinc/nginx-unprivileged:1.30.0-alpine3.23-slim

COPY devtools/strands-editor/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/devtools/strands-editor/dist /usr/share/nginx/html

EXPOSE 8080
