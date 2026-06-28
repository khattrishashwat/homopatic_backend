FROM node:20-alpine

WORKDIR /app

ARG PORT=5000
ENV NODE_ENV=production \
    PORT=${PORT}

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

RUN mkdir -p /app/src/uploads && chown -R node:node /app

USER node

EXPOSE ${PORT}

CMD ["npm", "start"]
