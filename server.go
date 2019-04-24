package main

import (
	"flag"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
)

const (
	DEFAULT_PORT  = 8080
	COOKIE_NAME   = "session"
	COOKIE_SECRET = "foobarwidget"
)

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

func main() {
	port := flag.Int("port", DEFAULT_PORT, "port to listen at")

	fs := http.FileServer(http.Dir(""))

	r := mux.NewRouter()
	r.HandleFunc("/login", login)
	r.HandleFunc("/logout", logout)
	r.HandleFunc("/changeCookie", changeCookie)
	r.PathPrefix("/").Handler(http.StripPrefix("/", fs))

	log.Println("Listening...")
	http.ListenAndServe(
		fmt.Sprintf(":%d", *port),
		handlers.LoggingHandler(os.Stdout, r),
	)
}
