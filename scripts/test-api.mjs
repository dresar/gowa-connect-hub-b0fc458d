import fs from "fs";
import path from "path";
import axios from "axios";

const envPath = path.resolve(process.cwd(), ".env");

let apiUrl = "";
let testPhone = "";
let testGroupJid = "";
let testGroupLink = "";

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  const lines = content.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [key, ...rest] = line.split("=");
    const value = rest.join("=").trim();
    if (key === "API_URL") apiUrl = value;
    if (key === "TEST_PHONE") testPhone = value;
    if (key === "TEST_GROUP_JID") testGroupJid = value;
    if (key === "TEST_GROUP_LINK") testGroupLink = value;
  }
}

const baseURL = apiUrl || "http://127.0.0.1:3003";

const client = axios.create({
  baseURL,
  timeout: 5000,
});

const tests = [
  { name: "app status", method: "get", url: "/app/status" },
  { name: "app devices", method: "get", url: "/app/devices" },
  { name: "app reconnect", method: "get", url: "/app/reconnect" },
  { name: "devices", method: "get", url: "/devices" },
  { name: "chats", method: "get", url: "/chats", config: { params: { limit: 50, offset: 0 } } },
  { name: "my groups", method: "get", url: "/user/my/groups" },
  { name: "my contacts", method: "get", url: "/user/my/contacts" },
  { name: "my privacy", method: "get", url: "/user/my/privacy" },
  { name: "my newsletters", method: "get", url: "/user/my/newsletters" },
  {
    name: "check contact",
    method: "get",
    url: "/user/check",
    requiresPhone: true,
    allowAnyStatus: true,
  },
  {
    name: "user info",
    method: "get",
    url: "/user/info",
    requiresPhone: true,
    allowAnyStatus: true,
  },
  {
    name: "user avatar",
    method: "get",
    url: "/user/avatar",
    requiresPhone: true,
    allowAnyStatus: true,
  },
  {
    name: "business profile",
    method: "get",
    url: "/user/business-profile",
    requiresPhone: true,
    allowAnyStatus: true,
  },
  {
    name: "group invite link",
    method: "get",
    url: "/group/invite-link",
    requiresGroupJid: true,
    allowAnyStatus: true,
  },
  {
    name: "group join requests",
    method: "get",
    url: "/group/participant-requests",
    requiresGroupJid: true,
    allowAnyStatus: true,
  },
  {
    name: "group info from link",
    method: "get",
    url: "/group/info-from-link",
    requiresGroupLink: true,
    allowAnyStatus: true,
  },
  {
    name: "group info",
    method: "get",
    url: "/group/info",
    requiresGroupJid: true,
    allowAnyStatus: true,
  },
  {
    name: "group participants",
    method: "get",
    url: "/group/participants",
    requiresGroupJid: true,
    allowAnyStatus: true,
  },
  {
    name: "export participants",
    method: "get",
    url: "/group/participants/export",
    requiresGroupJid: true,
    allowAnyStatus: true,
  },
  { name: "my groups v2", method: "get", url: "/user/my/groups" },
];

async function run() {
  console.log("Testing GOWA API");
  console.log("Base URL:", baseURL);
  console.log("Username: (none, auth disabled)");
  if (testPhone) console.log("TEST_PHONE:", testPhone);
  if (testGroupJid) console.log("TEST_GROUP_JID:", testGroupJid);
  if (testGroupLink) console.log("TEST_GROUP_LINK:", testGroupLink);

  let allOk = true;

  for (const t of tests) {
    if (t.requiresPhone && !testPhone) {
      console.log(`${t.name.padEnd(15)} -> SKIP (set TEST_PHONE in .env)`);
      continue;
    }
    if (t.requiresGroupJid && !testGroupJid) {
      console.log(`${t.name.padEnd(15)} -> SKIP (set TEST_GROUP_JID in .env)`);
      continue;
    }
    if (t.requiresGroupLink && !testGroupLink) {
      console.log(`${t.name.padEnd(15)} -> SKIP (set TEST_GROUP_LINK in .env)`);
      continue;
    }

    let config = t.config || {};
    if (t.requiresPhone) {
      config = {
        ...config,
        params: { ...(config.params || {}), phone: testPhone },
      };
    }
    if (t.requiresGroupJid) {
      config = {
        ...config,
        params: { ...(config.params || {}), jid: testGroupJid },
      };
    }
    if (t.requiresGroupLink) {
      config = {
        ...config,
        params: { ...(config.params || {}), link: testGroupLink },
      };
    }

    try {
      const response = await client.request({
        method: t.method,
        url: t.url,
        ...(t.data ? { data: t.data } : {}),
        ...config,
        validateStatus: t.allowAnyStatus ? () => true : undefined,
      });
      console.log(`${t.name.padEnd(15)} -> ${response.status}`);
      if (!t.allowAnyStatus && (response.status < 200 || response.status >= 300)) {
        allOk = false;
      }
    } catch (error) {
      allOk = false;
      const err = error || {};
      const status = err.response?.status;
      const code = err.code;
      if (status) {
        console.log(`${t.name.padEnd(15)} -> ERROR ${status}`);
      } else if (code) {
        console.log(`${t.name.padEnd(15)} -> NETWORK ERROR ${code}`);
      } else {
        console.log(`${t.name.padEnd(15)} -> UNKNOWN ERROR`);
      }
    }
  }

  if (allOk) {
    console.log("All tests passed");
  } else {
    console.log("Some tests failed");
    process.exitCode = 1;
  }
}

run();
