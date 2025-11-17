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
