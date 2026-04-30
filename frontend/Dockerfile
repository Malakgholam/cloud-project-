# Stage 1 - Build React App
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_TICKET_SERVICE_URL=http://localhost:3001
ARG VITE_SUPPORT_SERVICE_URL=http://localhost:3002
ARG VITE_REPORT_SERVICE_URL=http://localhost:3004

ENV VITE_TICKET_SERVICE_URL=$VITE_TICKET_SERVICE_URL
ENV VITE_SUPPORT_SERVICE_URL=$VITE_SUPPORT_SERVICE_URL
ENV VITE_REPORT_SERVICE_URL=$VITE_REPORT_SERVICE_URL

RUN npm run build

# Stage 2 - Serve with Nginx
FROM nginx:1.25-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
