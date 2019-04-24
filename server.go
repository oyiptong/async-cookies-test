package main

import (
	"flag"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
)

const (
	DEFAULT_PORT  = 8080
	COOKIE_NAME   = "session"
	COOKIE_SECRET = "foobarwidget"
)

type serverConfig struct {
	Port int
	Env  string
}

var config = serverConfig{
	Env:  "dev",
	Port: DEFAULT_PORT,
}
var store = sessions.NewCookieStore([]byte(COOKIE_SECRET))

func login(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, COOKIE_NAME)
	session.Values["authenticated"] = true
	session.Save(r, w)
	w.Write([]byte("login successful"))
}

func logout(w http.ResponseWriter, r *http.Request) {
	session, _ := store.Get(r, COOKIE_NAME)
	session.Values["authenticated"] = false
	session.Save(r, w)
	w.Write([]byte("logout successful"))
}

func changeCookie(w http.ResponseWriter, r *http.Request) {
	value := fmt.Sprintf("%v", rand.Float64())
	session, _ := store.Get(r, COOKIE_NAME)
	session.Values["rand_float"] = value
	session.Save(r, w)
	w.Write([]byte(fmt.Sprintf("cookie change successful. Set to %s", value)))
}

func init() {
	envPort := os.Getenv("PORT")
	if envPort != "" {
		if p, err := strconv.Atoi(envPort); err != nil && p > 0 {
			config.Port = p
		}
	}
	flagPort := flag.Int("port", DEFAULT_PORT, "port to listen at")
	if *flagPort != DEFAULT_PORT {
		config.Port = *flagPort
	}

	env := os.Getenv("ENVIRONMENT")
	if env == "production" {
		config.Env = env
	}
}

func main() {

	r := mux.NewRouter()
	r.HandleFunc("/login", login)
	r.HandleFunc("/logout", logout)
	r.HandleFunc("/changeCookie", changeCookie)

	if config.Env == "dev" {
		staticFS := http.FileServer(http.Dir("./static"))
		r.PathPrefix("/").Handler(http.StripPrefix("/", staticFS))
	}

	log.Println("Listening...")
	log.Fatal(http.ListenAndServe(
		fmt.Sprintf(":%d", config.Port),
		handlers.LoggingHandler(os.Stdout, r),
	))
}
