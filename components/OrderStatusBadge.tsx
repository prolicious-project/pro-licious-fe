export const STATUS_COLORS: Record<string, string> = {
  PLACED: "bg-blue-50 text-blue-600 border-blue-200",
  ACCEPTED: "bg-yellow-50 text-yellow-700 border-yellow-200",
  PREPARING: "bg-orange-50 text-orange-600 border-orange-200",
  READY: "bg-purple-50 text-purple-600 border-purple-200",
  PICKED_UP: "bg-indigo-50 text-indigo-600 border-indigo-200",
  OUT_FOR_DELIVERY: "bg-cyan-50 text-cyan-600 border-cyan-200",
  DELIVERED: "bg-green-50 text-green-600 border-green-200",
  COMPLETED: "bg-green-50 text-green-600 border-green-200",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
  REJECTED: "bg-red-50 text-red-600 border-red-200",
  ASSIGNED: "bg-blue-50 text-blue-600 border-blue-200",
  ARRIVED_VENDOR: "bg-amber-50 text-amber-600 border-amber-200",
  ARRIVED_CUSTOMER: "bg-teal-50 text-teal-600 border-teal-200",
  ACTIVE: "bg-green-50 text-green-600 border-green-200",
  INACTIVE: "bg-gray-50 text-gray-600 border-gray-200",
  PENDING: "bg-yellow-50 text-yellow-600 border-yellow-200",
  APPROVED: "bg-green-50 text-green-600 border-green-200",
  SUSPENDED: "bg-red-50 text-red-600 border-red-200",
  VERIFIED: "bg-green-50 text-green-600 border-green-200",
};

export default function OrderStatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLORS[status] || "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${colorClass}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}
