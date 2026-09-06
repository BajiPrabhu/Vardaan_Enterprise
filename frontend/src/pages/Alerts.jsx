import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Pagination from "../components/ui/Pagination";
import { useAuth } from "../auth/AuthContext";
import { useSocket } from "../realtime/SocketContext";
import { describeError } from "../lib/errors";
import { ALERT_TYPE_LABELS } from "../lib/labels";
import { useAlerts, useAcknowledgeAlert } from "../lib/alerts";

const CAN_ACK = ["owner", "administrator", "supervisor", "operator"];

export default function Alerts() {
  const { user } = useAuth();
  const canAck = CAN_ACK.includes(user?.role);
  const [unackOnly, setUnackOnly] = useState(false);
  const [page, setPage] = useState(1);

  const changeFilter = (nextUnackOnly) => {
    setUnackOnly(nextUnackOnly);
    setPage(1); // page 3 of "All" isn't necessarily page 3 of "Unacknowledged"
  };

  const { data, isLoading, isError, error } = useAlerts(
    unackOnly ? { acknowledged: false, page } : { page }
  );
  const acknowledgeAlert = useAcknowledgeAlert();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handleNew = (alert) => {
      queryClient.getQueryCache().findAll({ queryKey: ["alerts"] }).forEach((query) => {
        const [, params] = query.queryKey;
        const isFirstPage = !params?.page || params.page === 1;

        queryClient.setQueryData(query.queryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            // A live alert belongs at the top of page 1 — injecting it into
            // whatever page someone happens to be viewing would put it in
            // the wrong place and throw off that page's count.
            items: isFirstPage
              ? [alert, ...old.items].slice(0, old.per_page)
              : old.items,
            total: old.total + 1,
            unacknowledged_total: old.unacknowledged_total + 1,
          };
        });
      });
    };

    socket.on("alert:new", handleNew);
    return () => socket.off("alert:new", handleNew);
  }, [socket, queryClient]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            Alerts
          </h1>
          <p className="text-sm text-ink-muted">
            {data
              ? `${data.unacknowledged_total} unacknowledged of ${data.total}`
              : "Loading…"}
          </p>
        </div>
        <div className="flex gap-1 rounded-md border border-line p-0.5">
          <button
            onClick={() => changeFilter(false)}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              !unackOnly ? "bg-copper/10 text-copper" : "text-ink-muted"
            }`}
          >
            All
          </button>
          <button
            onClick={() => changeFilter(true)}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              unackOnly ? "bg-copper/10 text-copper" : "text-ink-muted"
            }`}
          >
            Unacknowledged
          </button>
        </div>
      </div>

      <Card>
        {isLoading && (
          <CardContent className="text-sm text-ink-muted">
            Loading alerts…
          </CardContent>
        )}
        {isError && (
          <CardContent className="text-sm text-status-critical">
            {describeError(error, "Couldn't load alerts.")}
          </CardContent>
        )}
        {data && data.items.length === 0 && (
          <CardContent className="text-sm text-ink-muted">
            {unackOnly
              ? "Nothing unacknowledged right now."
              : "No alerts yet."}
          </CardContent>
        )}
        {data && data.items.length > 0 && (
          <div className="divide-y divide-line">
            {data.items.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      alert.severity === "critical"
                        ? "text-status-critical"
                        : "text-status-warn"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">
                        {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
                      </span>
                      <Badge
                        tone={alert.severity === "critical" ? "critical" : "warn"}
                      >
                        {alert.severity}
                      </Badge>
                      {alert.device_type && (
                        <span className="text-xs text-ink-muted">
                          {alert.device_type}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink-muted">{alert.message}</p>
                    <p className="text-xs text-ink-muted">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {alert.acknowledged ? (
                  <span className="shrink-0 text-xs text-ink-muted">
                    Ack&rsquo;d by {alert.acknowledged_by?.username ?? "—"}
                  </span>
                ) : canAck ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => acknowledgeAlert.mutate(alert.id)}
                    disabled={acknowledgeAlert.isPending}
                  >
                    Acknowledge
                  </Button>
                ) : (
                  <Badge tone="neutral">Open</Badge>
                )}
              </div>
            ))}
          </div>
        )}
        {data && (
          <Pagination
            page={data.page}
            perPage={data.per_page}
            total={data.total}
            onPageChange={setPage}
          />
        )}
      </Card>
    </div>
  );
}
