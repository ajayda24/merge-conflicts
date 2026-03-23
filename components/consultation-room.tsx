"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  LocalParticipant,
  LocalVideoTrack,
  Track,
  createLocalVideoTrack,
  createLocalAudioTrack,
} from "livekit-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Clock,
  Wifi,
  WifiOff,
  Shield,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Professional {
  id: string;
  full_name: string;
  specialization: string;
  role: string;
  is_verified: boolean;
}

interface Props {
  roomName: string;
  userId: string;
  userName: string;
  professional: Professional;
  isDoctor?: boolean;
}

type ConnectionState = "idle" | "connecting" | "connected" | "ended" | "error";

export function ConsultationRoom({
  roomName,
  userId,
  userName,
  professional,
  isDoctor = false,
}: Props) {
  const router = useRouter();
  const exitPath = isDoctor ? "/pro/dashboard" : "/doctors";
  const roomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  // Store local video track — attach after connected screen renders
  const localVideoTrackRef = useRef<LocalVideoTrack | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  // Store pending remote video track — attach after connected screen renders
  const pendingRemoteTrackRef = useRef<RemoteTrack | null>(null);

  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Dynamic labels — swap based on who is viewing
  const remoteLabel = isDoctor ? "Patient" : professional.full_name;
  const localLabel = isDoctor
    ? `Dr. ${professional.full_name.split(" ").slice(-1)[0]}`
    : "You";
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Format seconds to mm:ss
  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const attachRemoteTrack = useCallback((track: RemoteTrack) => {
    if (track.kind === Track.Kind.Video) {
      if (remoteVideoRef.current) {
        track.attach(remoteVideoRef.current);
      } else {
        pendingRemoteTrackRef.current = track;
      }
    } else if (track.kind === Track.Kind.Audio) {
      if (remoteAudioRef.current) {
        track.attach(remoteAudioRef.current);
      } else {
        // Attach to a detached <audio> element so audio plays immediately
        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        document.body.appendChild(audioEl);
        track.attach(audioEl);
      }
    }
  }, []);

  const handleRemoteParticipant = useCallback(
    (participant: RemoteParticipant) => {
      setRemoteConnected(true);
      startTimer();

      // Future tracks — fires when the remote participant publishes after we join
      participant.on("trackSubscribed", (track: RemoteTrack) => {
        attachRemoteTrack(track);
      });

      // Already-published tracks — iterate publications and subscribe/attach
      participant.trackPublications.forEach((pub: RemoteTrackPublication) => {
        if (pub.isSubscribed && pub.track) {
          attachRemoteTrack(pub.track as RemoteTrack);
        } else if (!pub.isSubscribed) {
          pub.setSubscribed(true);
          // trackSubscribed will fire and call attachRemoteTrack
        }
      });
    },
    [startTimer, attachRemoteTrack],
  );

  const connect = useCallback(async () => {
    setConnectionState("connecting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionalId: professional.id, roomName }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to get token");
      }

      const { token } = await res.json();
      const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

      if (!livekitUrl) throw new Error("LiveKit URL not configured");

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: { width: 1280, height: 720, frameRate: 30 },
        },
      });
      roomRef.current = room;

      room.on(RoomEvent.ParticipantConnected, handleRemoteParticipant);
      room.on(RoomEvent.ParticipantDisconnected, () => {
        setRemoteConnected(false);
        stopTimer();
      });
      room.on(RoomEvent.Disconnected, () => {
        setConnectionState("ended");
        stopTimer();
      });

      await room.connect(livekitUrl, token);

      // Publish local tracks
      const [videoTrack, audioTrack] = await Promise.all([
        createLocalVideoTrack({
          resolution: { width: 1280, height: 720, frameRate: 30 },
        }),
        createLocalAudioTrack(),
      ]);

      await room.localParticipant.publishTrack(videoTrack);
      await room.localParticipant.publishTrack(audioTrack);

      // Store track in ref — we attach to the <video> element in useEffect after render
      localVideoTrackRef.current = videoTrack;

      setConnectionState("connected");

      // Handle already-connected participants
      room.remoteParticipants.forEach((p) => handleRemoteParticipant(p));

      // Mark consultation active
      await fetch("/api/consultations/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName, status: "active" }),
      });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Connection failed");
      setConnectionState("error");
    }
  }, [professional.id, roomName, handleRemoteParticipant, stopTimer]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    // isMuted=true means mic is currently off — enabling it means setMicrophoneEnabled(true)
    await room.localParticipant.setMicrophoneEnabled(isMuted);
    setIsMuted((m) => !m);
  }, [isMuted]);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setCameraEnabled(isCameraOff);
    setIsCameraOff((c) => !c);
  }, [isCameraOff]);

  const endCall = useCallback(async () => {
    stopTimer();
    const room = roomRef.current;
    if (room) await room.disconnect();
    roomRef.current = null;
    setConnectionState("ended");
    // Mark ended
    await fetch("/api/consultations/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomName, status: "ended" }),
    }).catch(() => {});
    router.push(exitPath);
  }, [roomName, router, stopTimer]);

  // Once the connected screen renders, attach both local and any pending remote tracks
  useEffect(() => {
    if (connectionState !== "connected") return;

    // Attach local video
    const localTrack = localVideoTrackRef.current;
    if (localTrack && localVideoRef.current) {
      localTrack.attach(localVideoRef.current);
    }

    // Flush pending remote video track
    const remoteTrack = pendingRemoteTrackRef.current;
    if (remoteTrack && remoteVideoRef.current) {
      remoteTrack.attach(remoteVideoRef.current);
      pendingRemoteTrackRef.current = null;
    }
  }, [connectionState]);

  // Cleanup on unmount — also remove any dynamically appended <audio> elements
  useEffect(() => {
    return () => {
      stopTimer();
      roomRef.current?.disconnect();
      // Clean up dynamically created audio elements
      document
        .querySelectorAll("audio[data-livekit-remote]")
        .forEach((el) => el.remove());
    };
  }, [stopTimer]);

  // ─── Idle / Lobby ────────────────────────────────────────────────────────────
  if (connectionState === "idle" || connectionState === "error") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border bg-card shadow-xl p-8 text-center space-y-6">
            {/* Doctor info */}
            <div className="space-y-2">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto text-2xl font-serif text-primary">
                {professional.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <h2 className="font-serif text-xl text-foreground">
                {professional.full_name}
              </h2>
              <p className="text-sm text-muted-foreground capitalize">
                {professional.role} · {professional.specialization}
              </p>
              <Badge
                variant="outline"
                className="text-xs border-green-400/40 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
              >
                <Shield className="h-3 w-3 mr-1" /> Verified Professional
              </Badge>
            </div>

            <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground text-left space-y-1">
              <p className="font-medium text-foreground text-xs uppercase tracking-wide">
                Before you join
              </p>
              <p>• This is a private, encrypted video session</p>
              <p>• Your camera and microphone will be requested</p>
              <p>• You can mute or disable camera at any time</p>
            </div>

            {errorMsg && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {errorMsg}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={connect} className="w-full gap-2">
                <Video className="h-5 w-5" />
                Start Video Consultation
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(exitPath)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Connecting ───────────────────────────────────────────────────────────────
  if (connectionState === "connecting") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Connecting to secure room…</p>
        </div>
      </div>
    );
  }

  // ─── Ended ────────────────────────────────────────────────────────────────────
  if (connectionState === "ended") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border bg-card shadow-xl p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto">
            <PhoneOff className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="font-serif text-xl text-foreground">Call Ended</h2>
          <p className="text-sm text-muted-foreground">
            Duration:{" "}
            <span className="font-medium text-foreground">
              {formatDuration(callDuration)}
            </span>
          </p>
          <Button onClick={() => router.push(exitPath)} className="w-full">
            {isDoctor ? "Back to Dashboard" : "Back to Professionals"}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Connected / In Call ─────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-black">
      {/* Video Grid */}
      <div className="flex-1 relative grid grid-cols-1 md:grid-cols-2 gap-0.5 bg-black min-h-0">
        {/* Remote video */}
        <div className="relative bg-zinc-900 flex items-center justify-center overflow-hidden md:col-span-1">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Hidden audio element for remote participant's microphone */}
          <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
          {!remoteConnected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-3">
              <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center text-2xl font-serif text-zinc-300">
                {isDoctor
                  ? "?"
                  : professional.full_name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)}
              </div>
              <p className="text-sm">Waiting for {remoteLabel} to join…</p>
            </div>
          )}
          {/* Remote participant name label */}
          <div className="absolute bottom-3 left-3">
            <span className="text-xs text-white bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
              {!isDoctor && <Shield className="h-3 w-3 text-green-400" />}
              {remoteLabel}
            </span>
          </div>
        </div>

        {/* Local video (user) */}
        <div className="relative bg-zinc-800 flex items-center justify-center overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isCameraOff ? "invisible" : ""}`}
          />
          {isCameraOff && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-14 w-14 rounded-full bg-zinc-700 flex items-center justify-center">
                <VideoOff className="h-6 w-6 text-zinc-400" />
              </div>
            </div>
          )}
          <div className="absolute bottom-3 left-3">
            <span className="text-xs text-white bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
              {localLabel}
            </span>
          </div>
          {isMuted && (
            <div className="absolute top-3 right-3">
              <span className="bg-red-500/80 backdrop-blur-sm rounded-full p-1.5 flex items-center justify-center">
                <MicOff className="h-3 w-3 text-white" />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-zinc-950 border-t border-zinc-800">
        {/* Status indicators */}
        <div className="flex items-center gap-3 min-w-[120px]">
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono tabular-nums">
              {formatDuration(callDuration)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {remoteConnected ? (
              <span className="flex items-center gap-1 text-green-400">
                <Wifi className="h-3.5 w-3.5" /> Live
              </span>
            ) : (
              <span className="flex items-center gap-1 text-zinc-500">
                <WifiOff className="h-3.5 w-3.5" /> Waiting
              </span>
            )}
          </div>
        </div>

        {/* Core controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${
              isMuted
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-zinc-700 hover:bg-zinc-600 text-white"
            }`}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </button>

          <button
            onClick={toggleCamera}
            className={`h-12 w-12 rounded-full flex items-center justify-center transition-colors ${
              isCameraOff
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-zinc-700 hover:bg-zinc-600 text-white"
            }`}
            aria-label={isCameraOff ? "Enable camera" : "Disable camera"}
          >
            {isCameraOff ? (
              <VideoOff className="h-5 w-5" />
            ) : (
              <Video className="h-5 w-5" />
            )}
          </button>

          <button
            onClick={endCall}
            className="h-12 w-12 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-700 text-white transition-colors"
            aria-label="End call"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>

        {/* Right side spacer */}
        <div className="min-w-[120px]" />
      </div>
    </div>
  );
}
