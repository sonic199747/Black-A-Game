const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const {
  RoomManagerProvider,
  useRoomManagerContext,
} = require("../../dist/features/multiplayer");

function RoomList() {
  const { rooms, summaries } = useRoomManagerContext();
  return React.createElement(
    React.Fragment,
    null,
    rooms.map((room) => {
      const summary = summaries[room.id];
      return React.createElement(
        "div",
        { key: room.id },
        React.createElement("strong", null, room.label),
        ` (${room.id})`,
        React.createElement(
          "div",
          null,
          "Status: ",
          summary?.status ?? "UNKNOWN"
        ),
        React.createElement(
          "div",
          null,
          "Progress: ",
          summary?.finishCount ?? 0,
          "/",
          summary?.playerCount ?? room.maxPlayers
        ),
        summary?.waitingForManual
          ? React.createElement(
              "div",
              null,
              "\u23F8 Waiting for manual decision"
            )
          : null
      );
    })
  );
}

function App() {
  return React.createElement(
    RoomManagerProvider,
    null,
    React.createElement(RoomList, null)
  );
}

console.log(renderToStaticMarkup(React.createElement(App, null)));
