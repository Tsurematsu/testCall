import call from "./call.js";

function removeVideoStream(IDclient) {
    let video = document.getElementById(IDclient);
    video.remove();
}

function addVideoStream(stream, IDclient, muted = true) {
    let video = document.createElement('video')
    if (window.pubID != null) { video.setAttribute(window.pubID, ''); }
    video.classList.add('videoCall');
    video.muted = muted;
    video.id = IDclient;
    video.srcObject = stream
    video.addEventListener('loadedmetadata', () => {
        video.play()
    })
    document.getElementById('video-grid').append(video)
}

async function main() {
    call.enableMSG = false;
    call.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    call.addStream = (stream) => { addVideoStream(stream.stream, stream.id); };
    call.removeStream = (idClient) => { removeVideoStream(idClient); };
    call.start();
}
main();