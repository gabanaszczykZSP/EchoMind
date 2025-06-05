#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <EEPROM.h>

const char* ssid = "SSID";
const char* password = "PASS";

ESP8266WebServer server(80);
const int EEPROM_SIZE = 512;

void handleRoot() {
  File file = SPIFFS.open("/index.html", "r");
  if (!file) {
    server.send(500, "text/plain", "Nie znaleziono index.html");
    return;
  }
  server.streamFile(file, "text/html");
  file.close();
}

void handleScoresGet() {
  EEPROM.begin(EEPROM_SIZE);
  String json = "[";
  bool started = false;
  for (int i = 0; i < EEPROM_SIZE; i += 4) {
    char nick[4];
    for (int j = 0; j < 3; ++j) nick[j] = EEPROM.read(i + j);
    nick[3] = '\0';
    int score = EEPROM.read(i + 3);
    if (nick[0] != 0xFF && nick[0] != '\0') {
      if (started) json += ",";
      json += "{\"nick\":\"" + String(nick) + "\",\"score\":" + String(score) + "}";
      started = true;
    }
  }
  json += "]";
  server.send(200, "application/json", json);
  EEPROM.end();
}

void handleScorePost() {
  if (server.hasArg("nick") && server.hasArg("score")) {
    String nick = server.arg("nick");
    int score = server.arg("score").toInt();
    EEPROM.begin(EEPROM_SIZE);
    bool updated = false;
    for (int i = 0; i < EEPROM_SIZE; i += 4) {
      char storedNick[4];
      for (int j = 0; j < 3; ++j) storedNick[j] = EEPROM.read(i + j);
      storedNick[3] = '\0';
      int storedScore = EEPROM.read(i + 3);
      if (nick == String(storedNick)) {
        if (score > storedScore) {
          EEPROM.write(i + 3, score);
          EEPROM.commit();
        }
        updated = true;
        break;
      }
    }
    if (!updated) {
      for (int i = 0; i < EEPROM_SIZE; i += 4) {
        if (EEPROM.read(i) == 0xFF || EEPROM.read(i) == '\0') {
          for (int j = 0; j < 3; ++j) EEPROM.write(i + j, nick[j]);
          EEPROM.write(i + 3, score);
          EEPROM.commit();
          break;
        }
      }
    }
    EEPROM.end();
    server.send(200, "text/plain", "OK");
  } else {
    server.send(400, "text/plain", "Brak danych");
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  SPIFFS.begin();
  server.on("/", handleRoot);
  server.on("/getScores", HTTP_GET, handleScoresGet);
  server.on("/submitScore", HTTP_POST, handleScorePost);
  server.begin();
}

void loop() {
  server.handleClient();
}
