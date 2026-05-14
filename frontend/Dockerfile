FROM node:20-alpine AS build
WORKDIR /app
ARG APP_VERSION=dev
ENV VITE_APP_VERSION=${APP_VERSION}
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Default to production stage
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Dev stage for Vite
FROM node:20-alpine AS development
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
