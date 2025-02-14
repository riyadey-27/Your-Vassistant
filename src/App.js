import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";
import alexaImage from "./assets/alexa.png";
import SpotifyWebApi from "spotify-web-api-js";

const spotifyApi = new SpotifyWebApi();
const API_KEY = "YOUR_OPENWEATHER_API_KEY"; // Replace with OpenWeather API Key

const Olivia = () => {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [accessToken, setAccessToken] = useState("");

  // Retrieve Spotify Access Token
  useEffect(() => {
    const hash = window.location.hash.substring(1)
      .split("&")
      .reduce((acc, item) => {
        let parts = item.split("=");
        acc[parts[0]] = decodeURIComponent(parts[1]);
        return acc;
      }, {});

    const _token = hash.access_token || localStorage.getItem("spotify_access_token");

    if (_token) {
      localStorage.setItem("spotify_access_token", _token);
      spotifyApi.setAccessToken(_token);
      setAccessToken(_token);
      window.history.pushState("", document.title, window.location.pathname);
    }
  }, []);

  // Authenticate with Spotify
  const authenticateSpotify = () => {
    const CLIENT_ID = "2f62c96df1eb4c3088bb4228b8c855e9";
    const REDIRECT_URI = window.location.origin;
    const SCOPES = [
      "user-read-playback-state",
      "user-modify-playback-state",
      "user-read-currently-playing",
      "streaming",
      "playlist-read-private",
      "user-library-read"
    ];

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=${SCOPES.join("%20")}&show_dialog=true`;

    window.location.href = authUrl;
  };

  // Speech Recognition
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      processCommand(transcript.toLowerCase());
    };

    recognition.start();
  };

  // Text-to-Speech
  const speak = (message) => {
    const speech = new SpeechSynthesisUtterance();
    speech.text = message;
    window.speechSynthesis.speak(speech);
    setResponse(message);
  };

  // Fetch Weather Data
  const getWeather = async (city) => {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`;
      const res = await axios.get(url);
      const { temp } = res.data.main;
      speak(`The current temperature in ${city} is ${temp} degrees Celsius.`);
    } catch (error) {
      speak("Sorry, I couldn't fetch the weather data.");
    }
  };

  // Spotify Music Controls
  const playMusic = async (songName) => {
    if (!accessToken) {
      speak("Please authenticate with Spotify first.");
      authenticateSpotify();
      return;
    }

    try {
      // Get available devices
      const { devices } = await spotifyApi.getMyDevices();
      if (devices.length === 0) {
        speak("No active Spotify device found. Please open Spotify on your phone, desktop, or web player.");
        return;
      }

      // Find an active device
      let activeDevice = devices.find(device => device.is_active) || devices[0];

      // Transfer playback if needed
      if (!activeDevice || !activeDevice.id) {
        speak("No active Spotify device found.");
        return;
      }

      await spotifyApi.transferMyPlayback([activeDevice.id]);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Search for the song
      const searchResults = await spotifyApi.searchTracks(songName);
      if (searchResults.tracks.items.length === 0) {
        speak("I couldn't find that song on Spotify.");
        return;
      }

      const trackUri = searchResults.tracks.items[0].uri;

      // Play the song
      await spotifyApi.play({ uris: [trackUri], device_id: activeDevice.id });
      speak(`Playing ${songName} on Spotify.`);
    } catch (error) {
      console.error("Error playing song:", error);
      speak("Something went wrong while playing the song.");
    }
  };

  const pauseMusic = async () => {
    try {
      await spotifyApi.pause();
      speak("Music paused.");
    } catch (error) {
      speak("I couldn't pause the music.");
    }
  };

  const nextTrack = async () => {
    try {
      await spotifyApi.skipToNext();
      speak("Skipping to the next track.");
    } catch (error) {
      speak("I couldn't skip to the next track.");
    }
  };

  const previousTrack = async () => {
    try {
      await spotifyApi.skipToPrevious();
      speak("Going back to the previous track.");
    } catch (error) {
      speak("I couldn't go back to the previous track.");
    }
  };

  // Process Voice Commands
  const processCommand = (command) => {
    if (command.includes("hello")) {
      speak("Hello! How can I assist you?");
    } else if (command.includes("how are you")) {
      speak("I'm Olivia, your voice assistant, and I'm feeling great!");
    } else if (command.includes("what is your name")) {
      speak("I am Olivia, your AI assistant.");
    } else if (command.includes("time")) {
      speak(`The current time is ${new Date().toLocaleTimeString()}`);
    } else if (command.includes("date")) {
      speak(`Today's date is ${new Date().toLocaleDateString()}`);
    } else if (command.includes("weather in")) {
      const city = command.replace("weather in", "").trim();
      getWeather(city);
    } else if (command.includes("who created you")) {
      speak("I was created by Riya, a talented developer!");
    } else if (command.includes("favorite color")) {
      speak("I like the color blue!");
    } else if (command.includes("tell me a joke")) {
      const jokes = [
        "Why don’t skeletons fight each other? Because they don’t have the guts!",
        "What do you call fake spaghetti? An impasta!",
        "Why did the computer go to therapy? It had too many bugs!"
      ];
      speak(jokes[Math.floor(Math.random() * jokes.length)]);
    } else if (command.includes("open google")) {
      speak("Opening Google.");
      window.open("https://www.google.com", "_blank");
    } else if (command.includes("open spotify")) {
      speak("Opening Spotify.");
      window.open("https://open.spotify.com/", "_blank");
    } else if (command.includes("play")) {
      playMusic(command.replace("play", "").trim());
    } else if (command.includes("pause music")) {
      pauseMusic();
    } else if (command.includes("next song")) {
      nextTrack();
    } else if (command.includes("previous song")) {
      previousTrack();
    } else {
      speak("I'm not sure how to respond to that, but I'm always learning!");
    }
  };

  return (
    <div className="container">
      <h1>Olivia - Your Voice Assistant</h1>
      <img src={alexaImage} alt="Olivia" className="alexa-img" />
      <button onClick={startListening}>🎤 Tap & Speak</button>
      <button onClick={authenticateSpotify}>🔊 Connect to Spotify</button>
      <p><strong>You said:</strong> {input}</p>
      <p><strong>Olivia:</strong> {response}</p>
    </div>
  );
};

export default Olivia;
