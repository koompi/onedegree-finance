FROM node:20-alpine AS builder
ARG VITE_API_URL=https://onedegree-api.tunnel.koompi.cloud
ENV VITE_API_URL=$VITE_API_URL
WORKDIR /app

# Copy source first (not just package.json) to break cache
COPY package.json ./
COPY src/ ./src/
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY nginx.conf ./
COPY Dockerfile ./

RUN npm install --legacy-peer-deps
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
