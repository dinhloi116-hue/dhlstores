FROM node:22-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4177
WORKDIR /app
COPY server.mjs xlsx.mjs ./
COPY public ./public
USER node
EXPOSE 4177
CMD ["node", "server.mjs"]
