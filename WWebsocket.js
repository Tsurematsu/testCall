let WWebsocket = new function() {
    const reserved_names = [
        "disconnected",
        "connected"
    ];
    let events = {};
    this.start = async(id_Service = null, memo = false, opcional = () => {
        if (!location.hash) {
            location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16);
        }
        return location.hash.substring(1);
    }) => {
        if (id_Service == null) { console.log("not service"); return; }
        return await (() => new Promise(async(resolve, reject) => {
            const roomName = 'observable-' + opcional();
            let drone = new ScaleDrone(id_Service);
            let { room, members } = await (() => new Promise((resolve, reject) => {
                drone.on('open', async() => {
                    let room = drone.subscribe(roomName);
                    let { members } = await (() => new Promise((resolve, reject) => {
                        room.on('members', (members) => {
                            resolve({ members: members });
                        });
                    }))();
                    resolve({ room: room, members: members });
                });
            }))();
            room.on('data', (message, client) => {
                if (memo == false) { if (client.id === drone.clientId) { return; } }
                for (const event in events) {
                    if (message[event]) {
                        let param = null;
                        try { param = [...Object.keys(message[event]), ...Object.values(message[event])]; } catch (error) {}
                        events[event](message[event], client, param);
                        break;
                    }
                }
            })
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    let message = { "disconnected": { onfocus: drone.clientId } };
                    drone.publish({ room: roomName, message })
                }
            });

            window.addEventListener('beforeunload', function() {
                let message = { "disconnected": { disconnect: drone.clientId } };
                drone.publish({ room: roomName, message })
            });

            let data = () => {
                let message = { "connected": { connected: drone.clientId } };
                drone.publish({ room: roomName, message })
            }
            data();

            resolve({
                on: (key, función) => { events[key] = función; },
                emit: (key, msg) => {
                    let message = {};
                    message[key] = msg;
                    drone.publish({ room: roomName, message })
                },
                info: () => { return reserved_names; },
                id: drone.clientId,
                drone: drone,
                members: members
            });
        }))();
    }
}

export default WWebsocket;