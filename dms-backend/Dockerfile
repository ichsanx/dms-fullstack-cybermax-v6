FROM node:20-alpine

WORKDIR /app

# 1) Install dependencies di environment Linux (container)
COPY package*.json ./
RUN npm ci

# 2) Copy Prisma schema + migrations dulu, lalu generate Prisma Client (engine Linux)
COPY prisma ./prisma
RUN npx prisma generate

# 3) Copy source code lainnya (node_modules tidak ikut karena .dockerignore)
COPY . .

# 4) Build NestJS
RUN npm run build

EXPOSE 3000

# 5) Apply migration lalu start
CMD sh -c "npx prisma migrate deploy && npm run start:prod"
