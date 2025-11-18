require("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    module: "Node16",
    moduleResolution: "node16",
  },
});

const { runRoomSimulation } = require("./roomSimulation.ts");

runRoomSimulation().catch((error) => {
  console.error(error);
  process.exit(1);
});
