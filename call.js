import WWebsocket from './WWebsocket.js';
let call = new function call() {
    this.addStream = (stream) => {};
    this.removeStream = (idClient) => {};
    this.enableMSG = false;
    this.stream = null;
    this.start = async() => {
        if (this.stream == null) { console.log("no stream"); return; }
        let stream = this.stream;
        this.addStream({ typeof: "local", stream: stream, id: "local" });
        let socket = await WWebsocket.start('CImVoVHIBNdWjnvN');
        let list_members = socket.members;
        let myId = socket.drone.clientId;
        let numOnline = 0;
        let clients = {};
        let msgObj = function msg(enableMSG) {
            this.enableMSG = enableMSG;
            this.log = (...args) => {
                if (this.enableMSG == true) {
                    console.log(...args);
                }
            }
        }
        let msg = new msgObj(this.enableMSG);

        msg.log("numero de servers: ", list_members.length - 1, " numero de mienbros: ", list_members.length, " mi id: ", myId, " listado de miembros: ", list_members);
        let result = await ((addStream) => {
            return new Promise((resolve, reject) => {
                let servers = {};
                let count = 0;
                // esto se debería cambiar por un await map
                async function set_connection_servers() {
                    if (list_members.length == 1) { resolve(servers); return; }
                    // if (list_members.length - 1 >= count) { resolve(true); return; }
                    let memberId;
                    try {
                        memberId = list_members[count].id;
                    } catch (error) {
                        resolve(servers);
                        return;
                    }
                    msg.log("conteo", count, "limite:", list_members.length - 1, "memberId:", memberId + (memberId == myId ? " => (this)" : " => (other)"));
                    if (memberId != myId) {
                        servers[memberId] = {
                            pc: new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }),
                            candidates: [],
                            remoteStream: null,
                        }
                        servers[memberId].pc.addStream(stream);
                        let offer = await servers[memberId].pc.createOffer();
                        await servers[memberId].pc.setLocalDescription(offer);
                        servers[memberId].pc.onaddstream = (event) => {
                            msg.log("video establecido con ", memberId);
                            servers[memberId].remoteStream = event.stream;
                            addStream({ typeof: "remote", stream: servers[memberId].remoteStream, id: memberId });
                        };
                        servers[memberId].pc.onicecandidate = (event) => {
                            if (event.candidate === null) {
                                msg.log("candidatos propios generados", servers[memberId].candidates);
                                socket.emit('candidates_client', { server: memberId, client: myId, candidates: servers[memberId].candidates });
                            } else if (event.candidate) {
                                servers[memberId].candidates.push(event.candidate);
                            }
                        }

                        msg.log("enviando-offer:", offer, " server:", memberId);
                        socket.emit('offer_client', { server: memberId, client: myId, offer: offer });
                        socket.on('answer_candidates_server', async(data) => {
                            if (data.server == memberId && data.client == myId) {
                                numOnline++;
                                msg.log("recibiendo-[answer,candidatos]: ", data.answer, " server:", data.server);
                                await servers[data.server].pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                                await Promise.all([...data.candidates].map(async(candidate) => {
                                    await servers[data.server].pc.addIceCandidate(new RTCIceCandidate(candidate));
                                }));
                                msg.log("candidatos agregados", data.candidates, " server:", data.server);
                                if (count >= list_members.length - 1) { resolve(servers); return; } else {
                                    next();
                                }
                            }
                        });
                    } else { next(); }

                    function next() {
                        count++;
                        set_connection_servers();
                    }
                }
                set_connection_servers();
            });
        })(this.addStream);

        msg.log("server iniciado:", result, myId);
        numOnline++;
        msg.log("miembros conectados", numOnline);
        socket.on('offer_client', async(data) => {
            if (data.server == myId) {
                numOnline++;
                clients[data.client] = {
                    pc: new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }),
                    candidates: [],
                    remoteStream: null,
                }
                clients[data.client].pc.addStream(stream);
                clients[data.client].pc.onaddstream = (event) => {
                    clients[data.client].remoteStream = event.stream;
                    msg.log("video establecido con ", data.client);
                    this.addStream({ typeof: "remote", stream: clients[data.client].remoteStream, id: data.client });
                };

                clients[data.client].pc.oniceconnectionstatechange = () => {
                    if (clients[data.client] && clients[data.client].pc.iceConnectionState === 'disconnected') {
                        numOnline--;
                        if (result[data.disconnect]) {
                            delete result[data.disconnect];
                        }
                        if (clients[data.disconnect]) {
                            delete clients[data.disconnect];
                        }
                        this.removeStream(data.disconnect);
                    }
                };
                await clients[data.client].pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                let answer = await clients[data.client].pc.createAnswer();
                await clients[data.client].pc.setLocalDescription(answer);
                // ------------------------------------------

                clients[data.client].pc.onicecandidate = (event) => {
                    if (event.candidate === null) {
                        msg.log("recibiendo-offer: ", data.offer, ' enviando-[candidatos,answer]', clients[data.client].candidates, answer);
                        socket.emit('answer_candidates_server', { server: myId, client: data.client, answer: answer, candidates: clients[data.client].candidates });
                        msg.log("miembros conectados", numOnline);
                    } else if (event.candidate) {
                        clients[data.client].candidates.push(event.candidate);
                    }
                };
            }
        });

        socket.on('candidates_client', async(data) => {
            if (data.server == myId) {
                msg.log("candidatos asíncronos recibidos:", data.candidates);
                await Promise.all([...data.candidates].map(async(candidate) => {
                    await clients[data.client].pc.addIceCandidate(new RTCIceCandidate(candidate));
                }));
                msg.log("miembros conectados", numOnline);
            }
        });

        socket.on('disconnected', async(data) => {
            if (data.disconnect) {
                numOnline--;
                if (result[data.disconnect]) {
                    delete result[data.disconnect];
                }
                if (clients[data.disconnect]) {
                    delete clients[data.disconnect];
                }
                this.removeStream(data.disconnect);
            }
        });
    }
}
export default call;