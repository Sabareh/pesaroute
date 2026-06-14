import NetInfo from "@react-native-community/netinfo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import type {
  JournalApiRequest,
  JournalApiResponse,
  PesaRouteApiClient,
  PortfolioApiRequest,
  PortfolioApiResponse
} from "../api/client";
import type {
  AuthCredentials,
  JournalEntry,
  JournalEntryDraft,
  PortfolioItem,
  PortfolioItemDraft,
  SyncAction,
  SyncEntity,
  SyncQueueItem
} from "../types";
import {
  loadJournalEntries,
  loadPortfolioItems,
  loadSyncQueue,
  saveJournalEntries,
  savePortfolioItems,
  saveSyncQueue
} from "./localStore";

type UseCloudSyncArgs = {
  apiClient: PesaRouteApiClient;
  auth: AuthCredentials | null;
  isAuthenticated: boolean;
};

type SyncSummary = {
  pending: number;
  failed: number;
  conflict: number;
  localOnly: number;
};

const LIQUIDITY_WEIGHTS: Record<PortfolioItem["liquidityLevel"], number> = {
  high: 3,
  medium: 2,
  low: 1,
  locked: 0
};

const RISK_ORDER: Record<PortfolioItem["riskLevel"], number> = {
  low: 1,
  moderate: 2,
  high: 3,
  very_high: 4
};

function nowIso() {
  return new Date().toISOString();
}

function newLocalId(prefix: SyncEntity) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseAmountToken(token: string): number | null {
  const trimmed = token.trim().toLowerCase();
  const multiplier = trimmed.endsWith("k") ? 1000 : 1;
  const value = Number(trimmed.replace(/[^\d.]/g, ""));
  return Number.isFinite(value) && value > 0 ? value * multiplier : null;
}

function parseAmountRange(text: string): { min?: string; max?: string; exact?: string } {
  const parts = text.split(/\s*(?:-|to)\s*/i).map(parseAmountToken);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return { min: parts[0].toFixed(2), max: parts[1].toFixed(2) };
  }
  if (parts[0]) {
    return { exact: parts[0].toFixed(2) };
  }
  return {};
}

function amountTextFromServer(
  mode: JournalEntry["amountDisplayMode"],
  exact?: string | null,
  rangeMin?: string | null,
  rangeMax?: string | null
) {
  if (mode === "hidden") return "Hidden";
  if (mode === "range" && rangeMin && rangeMax) return `KES ${rangeMin}-${rangeMax}`;
  if ((mode === "exact" || mode === "rounded") && exact) return `KES ${exact}`;
  return "Not set";
}

function journalPayload(entry: JournalEntry): JournalApiRequest {
  const parsed = parseAmountRange(entry.amountText);
  return {
    goal: entry.goal,
    decision: entry.decision,
    amount_display_mode: entry.amountDisplayMode,
    amount_exact: entry.amountDisplayMode === "exact" ? parsed.exact : undefined,
    amount_range_min: entry.amountDisplayMode === "range" ? parsed.min : undefined,
    amount_range_max: entry.amountDisplayMode === "range" ? parsed.max : undefined,
    reason: entry.reason,
    visibility: "private"
  };
}

function portfolioPayload(item: PortfolioItem): PortfolioApiRequest {
  const parsed = parseAmountRange(item.amountText);
  const maturityDate = item.maturityDate?.trim();
  return {
    asset_type: item.assetType,
    provider_name: item.providerName,
    amount_display_mode: item.amountDisplayMode,
    amount_exact: item.amountDisplayMode === "exact" ? parsed.exact : undefined,
    amount_range_min: item.amountDisplayMode === "range" ? parsed.min : undefined,
    amount_range_max: item.amountDisplayMode === "range" ? parsed.max : undefined,
    liquidity_level: item.liquidityLevel,
    risk_level: item.riskLevel,
    maturity_date: maturityDate && /^\d{4}-\d{2}-\d{2}$/.test(maturityDate) ? maturityDate : undefined,
    visibility: "private"
  };
}

function journalFromServer(server: JournalApiResponse, localId = `journal-server-${server.id}`): JournalEntry {
  return {
    localId,
    serverId: server.id,
    syncStatus: "synced",
    version: server.version,
    goal: server.goal || "General",
    decision: server.decision,
    amountDisplayMode: server.amount_display_mode,
    amountText: amountTextFromServer(
      server.amount_display_mode,
      server.amount_exact,
      server.amount_range_min,
      server.amount_range_max
    ),
    reason: server.reason || "",
    createdAt: server.created_at,
    updatedAt: server.updated_at
  };
}

function portfolioFromServer(server: PortfolioApiResponse, localId = `portfolio-server-${server.id}`): PortfolioItem {
  return {
    localId,
    serverId: server.id,
    syncStatus: "synced",
    version: server.version,
    assetType: server.asset_type,
    providerName: server.provider_name || "",
    amountDisplayMode: server.amount_display_mode,
    amountText: amountTextFromServer(
      server.amount_display_mode,
      server.amount_exact,
      server.amount_range_min,
      server.amount_range_max
    ),
    liquidityLevel: server.liquidity_level,
    riskLevel: server.risk_level,
    maturityDate: server.maturity_date ?? undefined,
    createdAt: server.created_at,
    updatedAt: server.updated_at
  };
}

function queueItem(entity: SyncEntity, action: SyncAction, localId: string): SyncQueueItem {
  const timestamp = nowIso();
  return {
    id: `${entity}-${action}-${localId}`,
    entity,
    action,
    localId,
    attempts: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function enqueue(queue: SyncQueueItem[], item: SyncQueueItem) {
  const existing = queue.find((candidate) => candidate.entity === item.entity && candidate.localId === item.localId);
  if (!existing) return [...queue, item];
  if (existing.action === "create" && item.action === "update") return queue;
  return queue.map((candidate) =>
    candidate.entity === item.entity && candidate.localId === item.localId
      ? { ...candidate, action: item.action, updatedAt: nowIso() }
      : candidate
  );
}

function safeSyncError(error: unknown) {
  return error instanceof Error ? error.message : "Sync failed";
}

function shouldConflict(localVersion: number | undefined, serverVersion: number | undefined) {
  return Boolean(localVersion && serverVersion && localVersion !== serverVersion);
}

export function useCloudSync({ apiClient, auth, isAuthenticated }: UseCloudSyncArgs) {
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const journalRef = useRef(journalEntries);
  const portfolioRef = useRef(portfolioItems);
  const queueRef = useRef(syncQueue);
  const syncingRef = useRef(false);

  useEffect(() => {
    journalRef.current = journalEntries;
  }, [journalEntries]);

  useEffect(() => {
    portfolioRef.current = portfolioItems;
  }, [portfolioItems]);

  useEffect(() => {
    queueRef.current = syncQueue;
  }, [syncQueue]);

  useEffect(() => {
    let mounted = true;
    async function loadLocalData() {
      const [storedJournal, storedPortfolio, storedQueue] = await Promise.all([
        loadJournalEntries(),
        loadPortfolioItems(),
        loadSyncQueue()
      ]);
      if (!mounted) return;
      setJournalEntries(storedJournal);
      setPortfolioItems(storedPortfolio);
      setSyncQueue(storedQueue);
      setLoaded(true);
    }
    void loadLocalData();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loaded) void saveJournalEntries(journalEntries);
  }, [journalEntries, loaded]);

  useEffect(() => {
    if (loaded) void savePortfolioItems(portfolioItems);
  }, [portfolioItems, loaded]);

  useEffect(() => {
    if (loaded) void saveSyncQueue(syncQueue);
  }, [loaded, syncQueue]);

  const saveJournalEntry = useCallback(
    (draft: JournalEntryDraft, localId?: string) => {
      const timestamp = nowIso();
      const nextStatus = isAuthenticated ? "pending" : "local_only";
      setJournalEntries((current) => {
        if (!localId) {
          const entry: JournalEntry = {
            ...draft,
            localId: newLocalId("journal"),
            syncStatus: nextStatus,
            createdAt: timestamp,
            updatedAt: timestamp
          };
          if (isAuthenticated) {
            setSyncQueue((queue) => enqueue(queue, queueItem("journal", "create", entry.localId)));
          }
          return [entry, ...current];
        }
        return current.map((entry) => {
          if (entry.localId !== localId) return entry;
          const action = entry.serverId ? "update" : "create";
          if (isAuthenticated) {
            setSyncQueue((queue) => enqueue(queue, queueItem("journal", action, entry.localId)));
          }
          return {
            ...entry,
            ...draft,
            syncStatus: nextStatus,
            syncError: undefined,
            updatedAt: timestamp,
            pendingDelete: false
          };
        });
      });
    },
    [isAuthenticated]
  );

  const deleteJournalEntry = useCallback(
    (localId: string) => {
      const timestamp = nowIso();
      setJournalEntries((current) => {
        const entry = current.find((candidate) => candidate.localId === localId);
        if (!entry) return current;
        if (!entry.serverId) {
          setSyncQueue((queue) => queue.filter((item) => item.entity !== "journal" || item.localId !== localId));
          return current.filter((candidate) => candidate.localId !== localId);
        }
        if (isAuthenticated) {
          setSyncQueue((queue) => enqueue(queue, queueItem("journal", "delete", localId)));
        }
        return current.map((candidate) =>
          candidate.localId === localId
            ? {
                ...candidate,
                pendingDelete: true,
                syncStatus: isAuthenticated ? "pending" : "local_only",
                syncError: undefined,
                updatedAt: timestamp
              }
            : candidate
        );
      });
    },
    [isAuthenticated]
  );

  const savePortfolioItem = useCallback(
    (draft: PortfolioItemDraft, localId?: string) => {
      const timestamp = nowIso();
      const nextStatus = isAuthenticated ? "pending" : "local_only";
      setPortfolioItems((current) => {
        if (!localId) {
          const item: PortfolioItem = {
            ...draft,
            localId: newLocalId("portfolio"),
            syncStatus: nextStatus,
            createdAt: timestamp,
            updatedAt: timestamp
          };
          if (isAuthenticated) {
            setSyncQueue((queue) => enqueue(queue, queueItem("portfolio", "create", item.localId)));
          }
          return [item, ...current];
        }
        return current.map((item) => {
          if (item.localId !== localId) return item;
          const action = item.serverId ? "update" : "create";
          if (isAuthenticated) {
            setSyncQueue((queue) => enqueue(queue, queueItem("portfolio", action, item.localId)));
          }
          return {
            ...item,
            ...draft,
            syncStatus: nextStatus,
            syncError: undefined,
            updatedAt: timestamp,
            pendingDelete: false
          };
        });
      });
    },
    [isAuthenticated]
  );

  const deletePortfolioItem = useCallback(
    (localId: string) => {
      const timestamp = nowIso();
      setPortfolioItems((current) => {
        const item = current.find((candidate) => candidate.localId === localId);
        if (!item) return current;
        if (!item.serverId) {
          setSyncQueue((queue) => queue.filter((queueItemValue) => queueItemValue.entity !== "portfolio" || queueItemValue.localId !== localId));
          return current.filter((candidate) => candidate.localId !== localId);
        }
        if (isAuthenticated) {
          setSyncQueue((queue) => enqueue(queue, queueItem("portfolio", "delete", localId)));
        }
        return current.map((candidate) =>
          candidate.localId === localId
            ? {
                ...candidate,
                pendingDelete: true,
                syncStatus: isAuthenticated ? "pending" : "local_only",
                syncError: undefined,
                updatedAt: timestamp
              }
            : candidate
        );
      });
    },
    [isAuthenticated]
  );

  const syncNow = useCallback(async () => {
    if (!auth || !loaded || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setSyncError(null);

    let nextJournal = [...journalRef.current];
    let nextPortfolio = [...portfolioRef.current];
    let nextQueue = [...queueRef.current];

    for (const entry of nextJournal) {
      if (entry.syncStatus === "local_only" && !entry.pendingDelete) {
        nextJournal = nextJournal.map((candidate) =>
          candidate.localId === entry.localId ? { ...candidate, syncStatus: "pending" } : candidate
        );
        nextQueue = enqueue(nextQueue, queueItem("journal", entry.serverId ? "update" : "create", entry.localId));
      }
    }
    for (const item of nextPortfolio) {
      if (item.syncStatus === "local_only" && !item.pendingDelete) {
        nextPortfolio = nextPortfolio.map((candidate) =>
          candidate.localId === item.localId ? { ...candidate, syncStatus: "pending" } : candidate
        );
        nextQueue = enqueue(nextQueue, queueItem("portfolio", item.serverId ? "update" : "create", item.localId));
      }
    }

    for (const queued of [...nextQueue]) {
      try {
        if (queued.entity === "journal") {
          const entry = nextJournal.find((candidate) => candidate.localId === queued.localId);
          if (!entry) {
            nextQueue = nextQueue.filter((item) => item.id !== queued.id);
            continue;
          }
          if (queued.action === "delete") {
            if (entry.serverId) await apiClient.deleteJournalEntry(entry.serverId, auth);
            nextJournal = nextJournal.filter((candidate) => candidate.localId !== entry.localId);
          } else {
            const response =
              entry.serverId && queued.action === "update"
                ? await apiClient.updateJournalEntry(entry.serverId, journalPayload(entry), auth)
                : await apiClient.createJournalEntry(journalPayload(entry), auth);
            nextJournal = nextJournal.map((candidate) =>
              candidate.localId === entry.localId ? journalFromServer(response, entry.localId) : candidate
            );
          }
        } else {
          const item = nextPortfolio.find((candidate) => candidate.localId === queued.localId);
          if (!item) {
            nextQueue = nextQueue.filter((candidate) => candidate.id !== queued.id);
            continue;
          }
          if (queued.action === "delete") {
            if (item.serverId) await apiClient.deletePortfolioItem(item.serverId, auth);
            nextPortfolio = nextPortfolio.filter((candidate) => candidate.localId !== item.localId);
          } else {
            const response =
              item.serverId && queued.action === "update"
                ? await apiClient.updatePortfolioItem(item.serverId, portfolioPayload(item), auth)
                : await apiClient.createPortfolioItem(portfolioPayload(item), auth);
            nextPortfolio = nextPortfolio.map((candidate) =>
              candidate.localId === item.localId ? portfolioFromServer(response, item.localId) : candidate
            );
          }
        }
        nextQueue = nextQueue.filter((item) => item.id !== queued.id);
      } catch (error) {
        const message = safeSyncError(error);
        nextQueue = nextQueue.map((item) =>
          item.id === queued.id
            ? { ...item, attempts: item.attempts + 1, lastError: message, updatedAt: nowIso() }
            : item
        );
        if (queued.entity === "journal") {
          nextJournal = nextJournal.map((entry) =>
            entry.localId === queued.localId ? { ...entry, syncStatus: "failed", syncError: "Sync failed. Retry when online." } : entry
          );
        } else {
          nextPortfolio = nextPortfolio.map((item) =>
            item.localId === queued.localId ? { ...item, syncStatus: "failed", syncError: "Sync failed. Retry when online." } : item
          );
        }
        setSyncError("Some items could not sync. Local copies are kept.");
      }
    }

    try {
      const [serverJournal, serverPortfolio] = await Promise.all([
        apiClient.listJournalEntries(auth),
        apiClient.listPortfolioItems(auth)
      ]);
      for (const serverEntry of serverJournal) {
        const local = nextJournal.find((entry) => entry.serverId === serverEntry.id);
        if (!local) {
          nextJournal.push(journalFromServer(serverEntry));
        } else if ((local.syncStatus === "pending" || local.syncStatus === "failed") && shouldConflict(local.version, serverEntry.version)) {
          nextJournal = nextJournal.map((entry) =>
            entry.localId === local.localId ? { ...entry, syncStatus: "conflict", syncError: "Server copy changed before sync finished." } : entry
          );
        } else if (!local.pendingDelete) {
          nextJournal = nextJournal.map((entry) =>
            entry.localId === local.localId ? journalFromServer(serverEntry, local.localId) : entry
          );
        }
      }
      for (const serverItem of serverPortfolio) {
        const local = nextPortfolio.find((item) => item.serverId === serverItem.id);
        if (!local) {
          nextPortfolio.push(portfolioFromServer(serverItem));
        } else if ((local.syncStatus === "pending" || local.syncStatus === "failed") && shouldConflict(local.version, serverItem.version)) {
          nextPortfolio = nextPortfolio.map((item) =>
            item.localId === local.localId ? { ...item, syncStatus: "conflict", syncError: "Server copy changed before sync finished." } : item
          );
        } else if (!local.pendingDelete) {
          nextPortfolio = nextPortfolio.map((item) =>
            item.localId === local.localId ? portfolioFromServer(serverItem, local.localId) : item
          );
        }
      }
    } catch {
      setSyncError((current) => current ?? "Could not refresh cloud records. Local copies are kept.");
    }

    nextJournal.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    nextPortfolio.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    setJournalEntries(nextJournal);
    setPortfolioItems(nextPortfolio);
    setSyncQueue(nextQueue);
    setLastSyncAt(new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }));
    setSyncing(false);
    syncingRef.current = false;
  }, [apiClient, auth, loaded]);

  useEffect(() => {
    if (isAuthenticated) void syncNow();
  }, [isAuthenticated, syncNow]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && isAuthenticated) void syncNow();
    });
    return () => subscription.remove();
  }, [isAuthenticated, syncNow]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && isAuthenticated) void syncNow();
    });
    return unsubscribe;
  }, [isAuthenticated, syncNow]);

  const syncSummary = useMemo<SyncSummary>(() => {
    const records = [...journalEntries, ...portfolioItems];
    return {
      pending: records.filter((record) => record.syncStatus === "pending").length,
      failed: records.filter((record) => record.syncStatus === "failed").length,
      conflict: records.filter((record) => record.syncStatus === "conflict").length,
      localOnly: records.filter((record) => record.syncStatus === "local_only").length
    };
  }, [journalEntries, portfolioItems]);

  const portfolioSummary = useMemo(() => {
    const visibleItems = portfolioItems.filter((item) => !item.pendingDelete);
    const categories = visibleItems.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.assetType] = (accumulator[item.assetType] ?? 0) + 1;
      return accumulator;
    }, {});
    const liquidityValues = visibleItems.map((item) => LIQUIDITY_WEIGHTS[item.liquidityLevel]);
    const liquidityScore = liquidityValues.length
      ? Number((liquidityValues.reduce((sum, value) => sum + value, 0) / liquidityValues.length).toFixed(2))
      : null;
    const highestRisk = Math.max(0, ...visibleItems.map((item) => RISK_ORDER[item.riskLevel]));
    const riskNote =
      highestRisk >= 4
        ? "Some items are marked very high risk; review concentration before adding more."
        : highestRisk >= 3
          ? "Some items are high risk; compare safer options and document your reasons."
          : visibleItems.length
            ? "No high-risk concentration detected from local mirror data."
            : "No portfolio items yet.";
    const exactOnly = visibleItems.length > 0 && visibleItems.every((item) => item.amountDisplayMode === "exact");
    const exactTotal = exactOnly
      ? visibleItems.reduce((sum, item) => sum + (parseAmountRange(item.amountText).exact ? Number(parseAmountRange(item.amountText).exact) : 0), 0)
      : null;
    return {
      categories,
      liquidityScore,
      riskNote,
      exactTotal,
      hidesExactTotal: visibleItems.length > 0 && !exactOnly,
      itemsCount: visibleItems.length
    };
  }, [portfolioItems]);

  return {
    journalEntries,
    portfolioItems,
    syncQueue,
    syncSummary,
    portfolioSummary,
    loaded,
    syncing,
    syncError,
    lastSyncAt,
    saveJournalEntry,
    savePortfolioItem,
    deleteJournalEntry,
    deletePortfolioItem,
    syncNow
  };
}
