-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "network" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddressBlacklist" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AddressBlacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportedToken" (
    "id" SERIAL NOT NULL,
    "network" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportedToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_txHash_key" ON "Transaction"("txHash");

-- CreateIndex
CREATE INDEX "Transaction_fromAddress_network_createdAt_idx" ON "Transaction"("fromAddress", "network", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_toAddress_network_createdAt_idx" ON "Transaction"("toAddress", "network", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_tokenAddress_network_createdAt_idx" ON "Transaction"("tokenAddress", "network", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AddressBlacklist_address_key" ON "AddressBlacklist"("address");

-- CreateIndex
CREATE INDEX "SupportedToken_network_symbol_idx" ON "SupportedToken"("network", "symbol");

-- CreateIndex
CREATE UNIQUE INDEX "SupportedToken_network_tokenAddress_key" ON "SupportedToken"("network", "tokenAddress");
