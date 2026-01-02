-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "durationSeconds" INTEGER,
    "notes" TEXT,
    "rpe" INTEGER,
    "legsCooked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StrengthEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "lift" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weightKg" REAL NOT NULL,
    "completedSets" INTEGER,
    "completedReps" INTEGER,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "StrengthEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KettlebellEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "bellsKg" INTEGER NOT NULL DEFAULT 16,
    "roundsCompleted" INTEGER,
    "emomMinutesCompleted" INTEGER,
    "swingsPerRound" INTEGER NOT NULL DEFAULT 10,
    "squatsPerRound" INTEGER NOT NULL DEFAULT 10,
    "pushupsTarget" INTEGER,
    CONSTRAINT "KettlebellEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RideEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "startTime" DATETIME,
    "durationSeconds" INTEGER NOT NULL,
    "distanceM" REAL NOT NULL,
    "elevationM" REAL,
    "avgSpeedMps" REAL,
    "effort" TEXT,
    "activityName" TEXT,
    "fingerprint" TEXT,
    CONSTRAINT "RideEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyCheckin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "sleep" INTEGER NOT NULL,
    "fatigue" INTEGER NOT NULL,
    "motivation" INTEGER NOT NULL,
    "weightKg" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "KettlebellEntry_sessionId_key" ON "KettlebellEntry"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "RideEntry_sessionId_key" ON "RideEntry"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "RideEntry_fingerprint_key" ON "RideEntry"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCheckin_date_key" ON "DailyCheckin"("date");
