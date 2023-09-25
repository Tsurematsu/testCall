import call from "./call.js";

function removeVideoStream(IDclient) {
    let video = document.getElementById(IDclient);
    video.remove();
}

function addVideoStream(obj, muted = false) {
    let { type, stream, IDclient } = obj;
    let video = document.createElement('video')
    if (window.pubID != null) { video.setAttribute(window.pubID, ''); }
    video.classList.add('videoCall');
    video.classList.add(type);
    video.muted = ((type == "local") ? true : muted);
    video.id = IDclient;
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play()
    })
    document.getElementById('video-grid').append(video)
}

async function main() {
    let stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getVideoTracks()[0].enabled = false;
    call.enableMSG = false;
    call.stream = stream;
    call.addStream = (obj) => { addVideoStream(obj); };
    call.removeStream = (idClient) => { removeVideoStream(idClient); };
    let room = await call.start('CImVoVHIBNdWjnvN', 'keydone', false);
    document.getElementById('off_video').addEventListener('click', () => {
        stream.getVideoTracks()[0].enabled = !(stream.getVideoTracks()[0].enabled);
    });
    document.getElementById('off_audio').addEventListener('click', () => {
        stream.getAudioTracks()[0].enabled = !(stream.getAudioTracks()[0].enabled);
    });
}
main();