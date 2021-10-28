const { dbConnection } = require("../database/config");

class Sockets {
  constructor(io) {
    this.io = io;

    this.bdConnection();
    this.socketEvents();
  }

  async bdConnection() {
    const client = await dbConnection();
    try {
      client.connect();
      this.collection = client.db("flowMind").collection("data");
    } catch (error) {
      console.error(error);
    }
  }

  socketEvents() {
    // On connection
    this.io.on("connection", (socket) => {
      socket.emit("me", socket.id);
      socket.on("client", async (dataClientId) => {
        try {
          let result = await this.collection.findOne({ _id: dataClientId });
          if (!result) {
            await this.collection.insertOne({ _id: dataClientId, data: [] });
          }
          socket.join(dataClientId);
          socket.broadcast.to(dataClientId).emit("guess", socket.id);
          socket.activeRoom = dataClientId;
        } catch (error) {}
      });

      socket.on("data", (data) => {
        console.log(data);
        this.collection.updateOne(
          {
            _id: socket.activeRoom,
          },
          {
            $push: {
              data: data,
            },
          }
        );
        this.io.to(socket.activeRoom).emit("dataResult", data);
      });

      socket.on("callEnded", (callEnded) => {
        socket.to(socket.activeRoom).emit("callEnded", callEnded);
      });

      socket.on("callUser", ({ userToCall, signalData, from, name }) => {
        console.log("Calling", userToCall);
        this.io
          .to(userToCall)
          .emit("callUser", { signal: signalData, from, name });
      });

      socket.on("answerCall", (data) => {
        this.io.to(data.to).emit("callAccepted", data.signal);
      });

      socket.on("videoId", (videoId) => {
        socket.to(socket.activeRoom).emit("videoId", videoId);
      });
    });
  }
}

module.exports = Sockets;
