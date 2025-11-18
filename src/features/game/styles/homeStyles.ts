import { StyleSheet } from "react-native";

/**
 * HomeScreen 样式表
 * 包含所有页面布局、颜色和排版样式
 */
export const homeStyles = StyleSheet.create({
  // ====== 容器和滚动 ======
  container: {
    flex: 1,
    backgroundColor: "#F7F9FC",
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },

  // ====== 房间管理 ======
  roomManagerContainer: {
    backgroundColor: "#0F172A",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  roomManagerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  roomManagerTitle: {
    fontSize: 16,
    color: "#BFDBFE",
    fontWeight: "700",
  },
  connectionStatus: {
    fontSize: 12,
    color: "#93C5FD",
    marginBottom: 8,
  },
  refreshButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.15)",
    marginBottom: 8,
  },
  refreshButtonText: {
    color: "#BFDBFE",
    fontSize: 12,
    fontWeight: "600",
  },
  roomCreateButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  roomCreateButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  roomList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  roomBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#38BDF8",
    marginRight: 8,
    marginBottom: 8,
  },
  roomBadgeActive: {
    backgroundColor: "#38BDF8",
  },
  roomBadgeText: {
    color: "#E0F2FE",
    fontSize: 13,
    fontWeight: "600",
  },
  roomBadgeTextActive: {
    color: "#0C4A6E",
  },
  roomBadgeStatus: {
    marginTop: 2,
    fontSize: 11,
    color: "#93C5FD",
  },
  roomBadgeStatusActive: {
    color: "#0F172A",
  },
  roomSummaryGrid: {
    marginTop: 12,
    gap: 8,
  },
  roomSummaryCard: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  roomSummaryTitle: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "700",
  },
  roomSummaryText: {
    color: "#CBD5F5",
    fontSize: 12,
    marginTop: 4,
  },
  roomSummaryNote: {
    color: "#93C5FD",
    fontSize: 11,
    marginTop: 4,
    fontStyle: "italic",
  },
  joinControls: {
    marginTop: 12,
    backgroundColor: "#16223a",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.3)",
  },
  joinControlsTitle: {
    color: "#E2E8F0",
    fontWeight: "700",
    marginBottom: 8,
  },
  joinInput: {
    backgroundColor: "rgba(15,23,42,0.7)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.4)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    color: "#F8FAFC",
    marginBottom: 10,
  },
  joinButtonRow: {
    flexDirection: "row",
    gap: 8,
  },
  joinButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
  },
  joinManualButton: {
    backgroundColor: "#C084FC",
  },
  joinAiButton: {
    backgroundColor: "#34D399",
  },
  joinSelectButton: {
    backgroundColor: "#FCD34D",
    marginBottom: 10,
  },
  joinButtonText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 12,
  },
  joinStatus: {
    marginTop: 8,
    fontSize: 12,
    color: "#FDE68A",
  },

  // ====== 标题部分 ======
  titleSection: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2563EB",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },

  // ====== 按钮部分 ======
  buttonSection: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  buttonSpace: {
    width: 10,
  },
  manualHintText: {
    marginTop: 8,
    fontSize: 12,
    color: "#F97316",
    fontWeight: "600",
  },

  // ====== 桌面布局 - 容器 ======
  tableSection: {
    flex: 1,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  tableStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  tableCountLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  tableCountSubLabel: {
    fontSize: 12,
    color: "#475569",
    marginTop: 2,
  },
  startGameButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#10B981",
  },
  startGameButtonDisabled: {
    backgroundColor: "rgba(15,23,42,0.2)",
  },
  startGameButtonText: {
    color: "#0F172A",
    fontWeight: "700",
  },
  startGameButtonTextDisabled: {
    color: "#94A3B8",
  },
  tableContainer: {
    borderRadius: 20,
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: "#0B1A2A",
    justifyContent: "space-between",
  },

  // ====== 桌面布局 - 座位行 ======
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },

  // ====== 桌面布局 - 元素 ======
  spacer: {
    flex: 0.8,
  },
  tableCenter: {
    flex: 2,
    marginHorizontal: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: "#BFDBFE",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // ====== 桌面中心信息 ======
  tableCenterTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
    textAlign: "center",
  },
  currentPlayerDisplay: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0284C7",
    textAlign: "center",
    marginBottom: 4,
  },
  currentPlayerHand: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },

  // ====== 其他 ======
  fallbackText: {
    marginTop: 20,
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
  },
  bottomSpacer: {
    height: 20,
  },
});
