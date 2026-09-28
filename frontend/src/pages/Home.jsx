import React, { useContext, useEffect, useRef, useState } from "react";
import { userDataContext } from "../context/UserContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import aiImg from "../assets/ai.gif";
import userImg from "../assets/user.gif";

import { CgMenuRight } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";
import { FaHistory } from "react-icons/fa";

function Home() {
  const {
    userData,
    serverUrl,
    setUserData,
    getGeminiResponse,
  } = useContext(userDataContext);

  const navigate = useNavigate();

  const [listening, setListening] = useState(false);
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const [ham, setHam] = useState(false);

  const isSpeakingRef = useRef(false);
  const recognitionRef = useRef(null);
  const isRecognizingRef = useRef(false);

  const synth = window.speechSynthesis;

  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, {
        withCredentials: true,
      });

      setUserData(null);
      navigate("/signin");
    } catch (error) {
      setUserData(null);
      console.log(error);
    }
  };

  const startRecognition = () => {
    if (
      !isSpeakingRef.current &&
      !isRecognizingRef.current
    ) {
      try {
        recognitionRef.current?.start();
        console.log("Recognition requested to start");
      } catch (error) {
        if (error.name !== "InvalidStateError") {
          console.error("Start error:", error);
        }
      }
    }
  };

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "hi-IN";

    const voices = window.speechSynthesis.getVoices();

    const hindiVoice = voices.find(
      (voice) => voice.lang === "hi-IN"
    );

    if (hindiVoice) {
      utterance.voice = hindiVoice;
    }

    isSpeakingRef.current = true;

    utterance.onend = () => {
      setAiText("");
      isSpeakingRef.current = false;

      setTimeout(() => {
        startRecognition();
      }, 800);
    };

    synth.cancel();
    synth.speak(utterance);
  };

  const handleCommand = (data) => {
    if (!data || !data.type || !data.response) {
      console.error("Invalid data received:", data);

      speak(
        "Sorry, I couldn't process that request. Please try again."
      );

      return;
    }

    const { type, userInput, response } = data;

    speak(response);

    if (type === "google-search") {
      const query = encodeURIComponent(userInput);

      window.open(
        `https://www.google.com/search?q=${query}`,
        "_blank"
      );
    }

    if (type === "calculator-open") {
      window.open(
        "https://www.google.com/search?q=calculator",
        "_blank"
      );
    }

    if (type === "instagram-open") {
      window.open(
        "https://www.instagram.com/",
        "_blank"
      );
    }

    if (type === "facebook-open") {
      window.open(
        "https://www.facebook.com/",
        "_blank"
      );
    }

    if (type === "weather-show") {
      window.open(
        "https://www.google.com/search?q=weather",
        "_blank"
      );
    }

    if (
      type === "youtube-search" ||
      type === "youtube-play"
    ) {
      const query = encodeURIComponent(userInput);

      window.open(
        `https://www.youtube.com/results?search_query=${query}`,
        "_blank"
      );
    }
  };

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error(
        "Speech Recognition is not supported in this browser."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognitionRef.current = recognition;

    let isMounted = true;

    const startTimeout = setTimeout(() => {
      if (
        isMounted &&
        !isSpeakingRef.current &&
        !isRecognizingRef.current
      ) {
        try {
          recognition.start();

          console.log(
            "Recognition requested to start"
          );
        } catch (error) {
          if (error.name !== "InvalidStateError") {
            console.error(error);
          }
        }
      }
    }, 1000);

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      setListening(true);

      console.log("Listening...");
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      setListening(false);

      if (
        isMounted &&
        !isSpeakingRef.current
      ) {
        setTimeout(() => {
          if (isMounted) {
            try {
              recognition.start();

              console.log(
                "Recognition restarted"
              );
            } catch (error) {
              if (
                error.name !== "InvalidStateError"
              ) {
                console.error(error);
              }
            }
          }
        }, 1000);
      }
    };

    recognition.onerror = (event) => {
      console.warn(
        "Recognition error:",
        event.error
      );

      isRecognizingRef.current = false;
      setListening(false);

      if (
        event.error !== "aborted" &&
        isMounted &&
        !isSpeakingRef.current
      ) {
        setTimeout(() => {
          if (isMounted) {
            try {
              recognition.start();

              console.log(
                "Recognition restarted after error"
              );
            } catch (error) {
              if (
                error.name !== "InvalidStateError"
              ) {
                console.error(error);
              }
            }
          }
        }, 1000);
      }
    };

    recognition.onresult = async (e) => {
      const transcript =
        e.results[
          e.results.length - 1
        ][0].transcript.trim();

      console.log("Transcript:", transcript);

      if (
        userData &&
        userData.assistantName &&
        transcript
          .toLowerCase()
          .includes(
            userData.assistantName.toLowerCase()
          )
      ) {
        setAiText("");
        setUserText(transcript);

        recognition.stop();

        isRecognizingRef.current = false;
        setListening(false);

        try {
          const data =
            await getGeminiResponse(transcript);

          if (data && data.response) {
            setAiText(data.response);

            handleCommand(data);
          } else {
            speak(
              "Sorry, I couldn't process that request."
            );
          }
        } catch (error) {
          console.error(
            "Assistant request failed:",
            error
          );

          speak(
            "Sorry, there was a problem connecting to the assistant."
          );
        }

        setUserText("");
      }
    };

    if (userData && userData.name) {
      const greeting =
        new SpeechSynthesisUtterance(
          `Hello ${userData.name}, what can I help you with?`
        );

      greeting.lang = "hi-IN";

      window.speechSynthesis.speak(greeting);
    }

    return () => {
      isMounted = false;

      clearTimeout(startTimeout);

      try {
        recognition.stop();
      } catch (error) {
        console.log(error);
      }

      setListening(false);
      isRecognizingRef.current = false;
    };
  }, []);

  return (
    <div className="w-full h-[100vh] bg-gradient-to-t from-black to-[#02023d] flex justify-center items-center flex-col gap-[15px] overflow-hidden">

      <CgMenuRight
        className="lg:hidden text-white absolute top-[20px] right-[20px] w-[25px] h-[25px] cursor-pointer"
        onClick={() => setHam(true)}
      />

      <div
        className={`
          absolute
          z-50
          top-0
          right-0
          w-full
          lg:w-[400px]
          h-full
          bg-[#000000e6]
          backdrop-blur-lg
          p-[20px]
          flex
          flex-col
          gap-[20px]
          items-start
          ${
            ham
              ? "translate-x-0"
              : "translate-x-full"
          }
          transition-transform
          duration-300
        `}
      >
        <RxCross1
          className="text-white absolute top-[20px] right-[20px] w-[25px] h-[25px] cursor-pointer"
          onClick={() => setHam(false)}
        />

        <button
          className="min-w-[150px] h-[60px] text-black font-semibold bg-white rounded-full cursor-pointer text-[19px]"
          onClick={handleLogOut}
        >
          Log Out
        </button>

        <button
          className="min-w-[150px] h-[60px] text-black font-semibold bg-white rounded-full cursor-pointer text-[19px] px-[20px] py-[10px]"
          onClick={() => navigate("/customize")}
        >
          Customize your Assistant
        </button>

        <div className="w-full h-[2px] bg-gray-400"></div>

        <h1 className="text-white font-semibold text-[19px]">
          History
        </h1>

        <div className="w-full flex-1 overflow-y-auto flex flex-col gap-[20px]">
          {userData?.history?.length > 0 ? (
            userData.history.map((his, index) => (
              <div
                key={`history-${index}`}
                className="text-gray-200 text-[18px] w-full min-h-[30px] flex-shrink-0 truncate"
                title={his}
              >
                {his}
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-[16px]">
              No history yet
            </p>
          )}
        </div>
      </div>

      <button
        className="
          min-w-[150px]
          h-[60px]
          text-black
          font-semibold
          absolute
          hidden
          lg:block
          top-[20px]
          right-[20px]
          bg-white
          rounded-full
          cursor-pointer
          text-[19px]
        "
        onClick={handleLogOut}
      >
        Log Out
      </button>

      <button
        className="
          min-w-[150px]
          h-[60px]
          text-black
          font-semibold
          bg-white
          absolute
          top-[100px]
          right-[20px]
          rounded-full
          cursor-pointer
          text-[19px]
          px-[20px]
          py-[10px]
          hidden
          lg:block
        "
        onClick={() => navigate("/customize")}
      >
        Customize your Assistant
      </button>

      <button
        className="
          absolute
          hidden
          lg:flex
          top-[210px]
          right-[20px]
          w-[50px]
          h-[50px]
          bg-white
          rounded-full
          justify-center
          items-center
          cursor-pointer
        "
        onClick={() => setHam(true)}
        title="History"
      >
        <FaHistory
          className="text-black w-[25px] h-[25px]"
        />
      </button>

      <div
        className="
          w-[300px]
          h-[400px]
          flex
          justify-center
          items-center
          overflow-hidden
          rounded-4xl
          shadow-lg
        "
      >
        <img
          src={userData?.assistantImage}
          alt="Assistant"
          className="h-full object-cover"
        />
      </div>

      <h1 className="text-white text-[18px] font-semibold">
        I'm {userData?.assistantName}
      </h1>

      {!aiText && (
        <img
          src={userImg}
          alt="User"
          className="w-[200px]"
        />
      )}

      {aiText && (
        <img
          src={aiImg}
          alt="AI"
          className="w-[200px]"
        />
      )}

      <h1 className="text-white text-[18px] font-semibold text-wrap">
        {userText
          ? userText
          : aiText
          ? aiText
          : null}
      </h1>
    </div>
  );
}

export default Home;
