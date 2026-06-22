import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173";
const PROJECT_REF = process.env.E2E_SUPABASE_PROJECT_REF ?? "yxgxdxxudrgiilggavtc";
const CHROME = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? "/usr/bin/google-chrome";
const PASSWORD = process.env.E2E_PASSWORD ?? "AbodeSpotTest#2026";

const ACCOUNTS = {
  admin: "admin@abodespot.test",
  buyer: "buyer@abodespot.test",
  agent: "agent@abodespot.test",
  agent2: "agent2@abodespot.test",
};

const TEST_PROPERTY_TITLE = "E2E Agent Listing";
const TEST_REPLY = "E2E reply: viewing is available this week.";
const TEST_INQUIRY = "E2E message: I am interested in this property.";
const TEST_AGENT_DIRECT = "E2E direct: can you co-broker this listing?";
const TEST_AGENT_DIRECT_REPLY = "E2E direct reply: yes, send the brief.";

const failures = [];
const pageProblems = [];

function readDotEnv() {
  const envPath = new URL("../.env", import.meta.url);
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx), line.slice(idx + 1).replace(/^['"]|['"]$/g, "")];
      })
  );
}

function getServiceRoleKey() {
  const out = execFileSync(
    "supabase",
    ["projects", "api-keys", "--project-ref", PROJECT_REF, "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
  );
  const keys = JSON.parse(out);
  const service = keys.find((k) => k.name === "service_role");
  const key = service?.api_key ?? service?.key;
  if (!key) throw new Error("Could not resolve Supabase service_role key from CLI output");
  return key;
}

const dotEnv = readDotEnv();
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? dotEnv.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? dotEnv.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !anonKey) throw new Error("Missing VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY");
const supabaseHost = new URL(supabaseUrl).host;

const service = createClient(supabaseUrl, getServiceRoleKey(), {
  auth: { autoRefreshToken: false, persistSession: false },
});

function check(condition, message) {
  if (!condition) failures.push(message);
}

async function requireOk(promise, label) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function listAuthUsers() {
  const users = [];
  for (let page = 1; page < 20; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    users.push(...(data.users ?? []));
    if (!data.users || data.users.length < 1000) break;
  }
  return users;
}

async function authUserByEmail(email) {
  return (await listAuthUsers()).find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function resetTestData() {
  await requireOk(
    service.from("properties").delete().ilike("title", "E2E%"),
    "delete E2E properties"
  );

  for (const email of Object.values(ACCOUNTS)) {
    const user = await authUserByEmail(email);
    if (user) {
      const { error } = await service.auth.admin.deleteUser(user.id);
      if (error) throw new Error(`delete ${email}: ${error.message}`);
    }
  }

  await requireOk(
    service.from("properties").delete().ilike("title", "E2E%"),
    "delete orphaned E2E properties"
  );
}

async function createAdmin() {
  const { data, error } = await service.auth.admin.createUser({
    email: ACCOUNTS.admin,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "E2E Admin" },
  });
  if (error) throw new Error(`create admin auth user: ${error.message}`);
  const user = data.user;

  await requireOk(
    service.from("users").upsert(
      {
        id: user.id,
        email: ACCOUNTS.admin,
        full_name: "E2E Admin",
        role: "admin",
        is_verified: true,
        agent_status: "approved",
      },
      { onConflict: "id" }
    ),
    "upsert admin profile"
  );
  await requireOk(
    service.from("user_roles").upsert(
      [
        { user_id: user.id, role: "user" },
        { user_id: user.id, role: "admin" },
      ],
      { onConflict: "user_id,role" }
    ),
    "upsert admin roles"
  );
}

async function createApprovedAgent(email, fullName) {
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw new Error(`create approved agent ${email}: ${error.message}`);
  const user = data.user;

  await requireOk(
    service.from("users").upsert(
      {
        id: user.id,
        email,
        full_name: fullName,
        phone: "+234 800 000 0001",
        company_name: "E2E Partner Realty",
        role: "agent",
        is_verified: true,
        agent_status: "approved",
      },
      { onConflict: "id" }
    ),
    `upsert approved agent profile ${email}`
  );
  await requireOk(
    service.from("user_roles").upsert(
      [
        { user_id: user.id, role: "user" },
        { user_id: user.id, role: "agent" },
      ],
      { onConflict: "user_id,role" }
    ),
    `upsert approved agent roles ${email}`
  );
  return user;
}

async function dbUser(email) {
  const { data, error } = await service.from("users").select("*").eq("email", email).maybeSingle();
  if (error) throw new Error(`db user ${email}: ${error.message}`);
  return data;
}

async function dbRoles(userId) {
  const { data, error } = await service.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error(`db roles ${userId}: ${error.message}`);
  return (data ?? []).map((row) => row.role);
}

async function waitForDb(label, fn, timeout = 20000) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    last = await fn();
    if (last) return last;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function newPage(browser, label) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => pageProblems.push(`${label}: page error: ${error.message}`));
  page.on("response", async (response) => {
    if (response.status() < 400 || !response.url().includes(supabaseHost)) return;
    let body = "";
    try {
      body = await response.text();
    } catch {
      body = "<unreadable body>";
    }
    pageProblems.push(`${label}: HTTP ${response.status()} ${response.url()} ${body.slice(0, 500)}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error" && !/Failed to load resource/i.test(msg.text())) {
      pageProblems.push(`${label}: console error: ${msg.text()}`);
    }
  });
  return { context, page };
}

async function registerBuyer(browser) {
  const { context, page } = await newPage(browser, "buyer-register");
  await page.goto(`${BASE_URL}/register`);
  await page.getByRole("button", { name: /I'm a Buyer \/ Renter/i }).click();
  await page.getByRole("button", { name: /Continue as Buyer/i }).click();
  await page.getByLabel(/Full name/i).fill("E2E Buyer");
  await page.getByLabel(/^Email$/i).fill(ACCOUNTS.buyer);
  await page.getByLabel(/^Password$/i).fill(PASSWORD);
  await page.getByRole("button", { name: /Create account/i }).click();
  await page.waitForURL((url) => url.pathname === "/dashboard", { timeout: 25000 });
  await page.getByText(/Welcome back,/i).waitFor({ timeout: 15000 });

  const user = await waitForDb("buyer profile", () => dbUser(ACCOUNTS.buyer));
  const roles = await dbRoles(user.id);
  check(roles.includes("user"), "Buyer signup did not create the user role");
  check(user.role === "user", `Buyer profile role should be user, got ${user.role}`);
  await context.close();
}

async function registerAgent(browser) {
  const { context, page } = await newPage(browser, "agent-register");
  await page.goto(`${BASE_URL}/register`);
  await page.getByRole("button", { name: /I'm an Agent \/ Seller/i }).click();
  await page.getByRole("button", { name: /Continue as Agent/i }).click();
  await page.getByLabel(/Full name/i).fill("E2E Agent");
  await page.getByLabel(/^Email$/i).fill(ACCOUNTS.agent);
  await page.getByLabel(/^Password$/i).fill(PASSWORD);
  await page.getByRole("button", { name: /Create account/i }).click();
  await page.getByRole("heading", { name: /Tell us about yourself/i }).waitFor({ timeout: 25000 });
  await page.getByLabel(/Phone number/i).fill("+234 800 000 0000");
  await page.getByLabel(/Company \/ Agency name/i).fill("E2E Realty");
  await page.getByLabel(/License number/i).fill("E2E-12345");
  await page.getByLabel(/Additional information/i).fill("E2E agent application.");
  await page.getByRole("button", { name: /Submit Application/i }).click();
  await page.waitForURL((url) => url.pathname === "/dashboard", { timeout: 25000 });

  const user = await waitForDb("agent profile", () => dbUser(ACCOUNTS.agent));
  const roles = await dbRoles(user.id);
  check(roles.includes("pending_agent"), "Agent signup did not create pending_agent role before approval");

  const { data: apps, error } = await service
    .from("agent_applications")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending");
  if (error) throw new Error(`agent application query: ${error.message}`);
  check(apps.length === 1, `Agent signup should create exactly one pending application, found ${apps.length}`);
  await context.close();
}

async function login(browser, email, expectedPath, label) {
  const { context, page } = await newPage(browser, label);
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel(/^Email$/i).fill(email);
  await page.getByLabel(/^Password$/i).fill(PASSWORD);
  await page.getByRole("button", { name: /Sign in/i }).click();
  await page.waitForURL((url) => url.pathname === expectedPath, { timeout: 25000 });
  return { context, page };
}

async function approveAgent(browser) {
  const agent = await dbUser(ACCOUNTS.agent);
  const { context, page } = await login(browser, ACCOUNTS.admin, "/admin/dashboard", "admin-approve-agent");
  await page.getByRole("tab", { name: /Agent Applications/i }).click();
  const firstApprove = page.getByRole("button", { name: /Approve Agent/i }).first();
  const hasApproveButton = await firstApprove.waitFor({ state: "visible", timeout: 15000 }).then(() => true).catch(() => false);
  check(hasApproveButton, "Admin dashboard did not render an Approve Agent button for the pending test agent");
  const approveButtons = hasApproveButton
    ? await page.getByRole("button", { name: /Approve Agent/i }).count()
    : 0;
  check(approveButtons === 1, `Admin should see one pending approval button for test agent, found ${approveButtons}`);
  if (hasApproveButton) await firstApprove.click();

  const approvedState = await waitForDb("agent approval", async () => {
    const roles = await dbRoles(agent.id);
    const profile = await dbUser(ACCOUNTS.agent);
    const { data: pendingApps, error } = await service
      .from("agent_applications")
      .select("id")
      .eq("user_id", agent.id)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return roles.includes("agent")
      && !roles.includes("pending_agent")
      && profile.role === "agent"
      && profile.agent_status === "approved"
      && pendingApps.length === 0
      ? { roles, profile }
      : null;
  });
  const refreshed = approvedState.profile;
  check(refreshed.role === "agent", `Approved agent profile role should be agent, got ${refreshed.role}`);
  check(refreshed.agent_status === "approved", `Approved agent status should be approved, got ${refreshed.agent_status}`);
  await context.close();
}

async function createAgentProperty(browser) {
  const { context, page } = await login(browser, ACCOUNTS.agent, "/agent", "agent-property");
  await page.getByRole("tab", { name: /My Listings/i }).click();
  const addButton = page.getByRole("button", { name: /Add Your First Property|Add Property/i }).first();
  await addButton.click();

  const titleField = page.getByLabel(/Title/i).or(page.getByPlaceholder(/Modern/i)).first();
  const titleVisible = await titleField.waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false);
  check(titleVisible, "Agent Add Property button did not open a property form");
  if (!titleVisible) {
    await context.close();
    return null;
  }

  await titleField.fill(TEST_PROPERTY_TITLE);
  await page.getByLabel(/Price/i).fill("85000000");
  await page.getByLabel(/Bedrooms/i).fill("3");
  await page.getByLabel(/Bathrooms/i).fill("2");
  check(await page.getByLabel(/^Area$/i).count() === 0, "Agent Add Property should not render an Area field");
  await page.getByLabel(/Address/i).fill("12 E2E Test Avenue");
  check(await page.getByLabel(/^City$/i).count() === 0, "Agent Add Property should not render a City field");
  await page.getByLabel(/State/i).fill("Lagos");
  await page.getByLabel(/Description/i).fill("Created by the E2E smoke test.");
  await page.getByRole("button", { name: /Create Property|Submit Property/i }).click();

  const property = await waitForDb("agent-created property", async () => {
    const { data, error } = await service
      .from("properties")
      .select("*")
      .eq("title", TEST_PROPERTY_TITLE)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });
  check(property.status === "pending", `Agent-created property should start pending, got ${property.status}`);
  await context.close();
  return property;
}

async function approvePropertyInAdmin(browser, propertyId) {
  const { context, page } = await login(browser, ACCOUNTS.admin, "/admin/dashboard", "admin-approve-property");
  await page.goto(`${BASE_URL}/admin/properties`);
  await page.getByPlaceholder(/Search title\/city/i).fill(TEST_PROPERTY_TITLE);
  await page.getByText(TEST_PROPERTY_TITLE).waitFor({ timeout: 15000 });
  const approve = page.getByRole("button", { name: new RegExp(`Approve ${TEST_PROPERTY_TITLE}`, "i") });
  const hasNamedApprove = await approve.waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false);
  check(hasNamedApprove, "Admin property approve icon button is missing an accessible label");
  if (hasNamedApprove) await approve.click();

  await waitForDb("property approval", async () => {
    const { data, error } = await service.from("properties").select("status").eq("id", propertyId).maybeSingle();
    if (error) throw new Error(error.message);
    return data?.status === "approved";
  });
  await context.close();
}

function orderedParticipants(userId, otherUserId) {
  return [userId, otherUserId].sort();
}

async function findConversation({ propertyId = null, participantOne, participantTwo, type }) {
  const [participantA, participantB] = orderedParticipants(participantOne, participantTwo);
  let query = service
    .from("conversations")
    .select("*")
    .eq("conversation_type", type)
    .eq("participant_a_id", participantA)
    .eq("participant_b_id", participantB);
  if (propertyId) query = query.eq("property_id", propertyId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`find ${type} conversation: ${error.message}`);
  return data;
}

async function messagesForConversation(conversationId) {
  const { data, error } = await service
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`messages for conversation ${conversationId}: ${error.message}`);
  return data ?? [];
}

async function buyerConversation(browser, propertyId) {
  const { context, page } = await login(browser, ACCOUNTS.buyer, "/dashboard", "buyer-conversation");
  await page.goto(`${BASE_URL}/property/${propertyId}`);
  await page.getByRole("heading", { name: TEST_PROPERTY_TITLE }).waitFor({ timeout: 15000 });

  const save = page.getByRole("button", { name: /Save property|Unsave property/i });
  const hasNamedSave = await save.waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false);
  check(hasNamedSave, "Property detail save button is missing an accessible label");
  if (hasNamedSave) await save.click();

  await page.getByLabel(/^Message$/i).fill(TEST_INQUIRY);
  await page.getByRole("button", { name: /Send message/i }).click();
  await page.waitForURL((url) => url.pathname === "/messages", { timeout: 25000 });

  const buyer = await dbUser(ACCOUNTS.buyer);
  const agent = await dbUser(ACCOUNTS.agent);
  const conversation = await waitForDb("buyer-agent conversation", () => (
    findConversation({
      propertyId,
      participantOne: buyer.id,
      participantTwo: agent.id,
      type: "property",
    })
  ));
  const messages = await waitForDb("buyer initial chat message", async () => {
    const rows = await messagesForConversation(conversation.id);
    return rows.find((row) => row.message === TEST_INQUIRY) ? rows : null;
  });
  check(messages.length === 1, `Buyer contact should create one initial chat message, found ${messages.length}`);
  check(messages[0]?.sender_id === buyer.id, "Initial property chat message should be sent by the buyer");
  check(messages[0]?.receiver_id === agent.id, "Initial property chat message should be addressed to the listing agent");
  check(messages.every((row) => row.sender_id !== row.receiver_id), "Property chat contains a self-addressed message");

  const saved = await waitForDb("saved property", async () => {
    const buyer = await dbUser(ACCOUNTS.buyer);
    const { data, error } = await service
      .from("saved_properties")
      .select("*")
      .eq("user_id", buyer.id)
      .eq("property_id", propertyId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });
  check(Boolean(saved), "Buyer save action did not persist saved property");
  await context.close();
  return conversation;
}

async function agentReply(browser, conversationId) {
  const { context, page } = await login(browser, ACCOUNTS.agent, "/agent", "agent-reply");
  await page.goto(`${BASE_URL}/messages?conversation=${conversationId}`);
  await page.locator("section").getByText(TEST_INQUIRY, { exact: true }).waitFor({ timeout: 15000 });
  await page.getByLabel(/^Message$/i).fill(TEST_REPLY);
  await page.getByRole("button", { name: /Send message/i }).click();

  await waitForDb("agent reply message", async () => {
    const { data, error } = await service.from("messages").select("*").eq("message", TEST_REPLY).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });
  const buyer = await dbUser(ACCOUNTS.buyer);
  const agent = await dbUser(ACCOUNTS.agent);
  const messages = await messagesForConversation(conversationId);
  check(messages.length === 2, `Buyer-agent room should have exactly two messages after reply, found ${messages.length}`);
  check(messages[0]?.sender_id === buyer.id && messages[0]?.receiver_id === agent.id, "First buyer-agent message has the wrong direction");
  check(messages[1]?.sender_id === agent.id && messages[1]?.receiver_id === buyer.id, "Agent reply has the wrong direction");
  check(messages.every((row) => row.sender_id !== row.receiver_id), "Buyer-agent room contains a self-addressed message");
  await context.close();
}

async function buyerReadsReply(browser, conversationId) {
  const { context, page } = await login(browser, ACCOUNTS.buyer, "/dashboard", "buyer-read-reply");
  await page.goto(`${BASE_URL}/messages`);
  await page.getByRole("heading", { name: "Messages" }).waitFor({ timeout: 15000 });
  const replyRoom = page.getByRole("button", { name: new RegExp(TEST_REPLY, "i") });
  await replyRoom.waitFor({ state: "visible", timeout: 15000 });
  const bareMessagesComposerVisible = await page
    .getByLabel(/^Message$/i)
    .isVisible()
    .catch(() => false);
  check(!bareMessagesComposerVisible, "Bare /messages auto-opened a chat instead of showing rooms first");

  await replyRoom.click();
  await page.waitForURL((url) => url.pathname === "/messages" && url.searchParams.get("conversation") === conversationId, { timeout: 15000 });
  await page.locator("section").getByText(TEST_REPLY, { exact: true }).waitFor({ timeout: 15000 });

  await waitForDb("buyer reply read state", async () => {
    const { data, error } = await service
      .from("messages")
      .select("is_read")
      .eq("conversation_id", conversationId)
      .eq("message", TEST_REPLY)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.is_read ? data : null;
  });

  const activeRoomBadgeVisible = await page
    .getByText(/^1 active$/i)
    .isVisible()
    .catch(() => false);
  check(!activeRoomBadgeVisible, "Messages screen still shows a numeric active badge after the buyer opened the unread reply");

  await page.goto(`${BASE_URL}/dashboard`);
  const messagesTabWithoutBadge = await page
    .getByRole("tab", { name: /^Messages$/i })
    .waitFor({ state: "visible", timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  check(messagesTabWithoutBadge, "Messages tab still shows a number badge after the buyer opened the unread reply");
  await context.close();
}

async function agentDirectChat(browser) {
  const agent = await dbUser(ACCOUNTS.agent);
  const agent2 = await dbUser(ACCOUNTS.agent2);

  const starter = await login(browser, ACCOUNTS.agent, "/agent", "agent-direct-start");
  await starter.page.goto(`${BASE_URL}/messages`);
  await starter.page.getByRole("button", { name: /New agent chat/i }).click();
  await starter.page.getByRole("button", { name: /Chat with E2E Agent Two/i }).click();
  await starter.page.getByLabel(/Initial message/i).fill(TEST_AGENT_DIRECT);
  await starter.page.getByRole("button", { name: /Start chat/i }).click();
  await starter.page.waitForURL((url) => url.pathname === "/messages", { timeout: 25000 });

  const conversation = await waitForDb("agent-agent direct conversation", () => (
    findConversation({
      participantOne: agent.id,
      participantTwo: agent2.id,
      type: "direct",
    })
  ));
  const initialMessages = await waitForDb("agent direct initial message", async () => {
    const rows = await messagesForConversation(conversation.id);
    return rows.find((row) => row.message === TEST_AGENT_DIRECT) ? rows : null;
  });
  check(initialMessages[0]?.sender_id === agent.id && initialMessages[0]?.receiver_id === agent2.id, "Direct agent chat initial message has the wrong direction");
  await starter.context.close();

  const responder = await login(browser, ACCOUNTS.agent2, "/agent", "agent-direct-reply");
  await responder.page.goto(`${BASE_URL}/messages?conversation=${conversation.id}`);
  await responder.page.locator("section").getByText(TEST_AGENT_DIRECT, { exact: true }).waitFor({ timeout: 15000 });
  await responder.page.getByLabel(/^Message$/i).fill(TEST_AGENT_DIRECT_REPLY);
  await responder.page.getByRole("button", { name: /Send message/i }).click();

  const finalMessages = await waitForDb("agent direct reply message", async () => {
    const rows = await messagesForConversation(conversation.id);
    return rows.find((row) => row.message === TEST_AGENT_DIRECT_REPLY) ? rows : null;
  });
  check(finalMessages.length === 2, `Direct agent room should have exactly two messages, found ${finalMessages.length}`);
  check(finalMessages[1]?.sender_id === agent2.id && finalMessages[1]?.receiver_id === agent.id, "Direct agent reply has the wrong direction");
  check(finalMessages.every((row) => row.sender_id !== row.receiver_id), "Direct agent room contains a self-addressed message");
  await responder.context.close();
}

async function routeSmoke(browser) {
  const admin = await login(browser, ACCOUNTS.admin, "/admin/dashboard", "admin-route-smoke");
  for (const path of ["/admin/dashboard", "/admin/users", "/admin/properties", "/admin/inquiries", "/admin/featured", "/admin/homepage"]) {
    await admin.page.goto(`${BASE_URL}${path}`);
    await admin.page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    check(!admin.page.url().includes("/login"), `Admin route redirected unexpectedly: ${path}`);
  }
  await admin.context.close();

  const agent = await login(browser, ACCOUNTS.agent, "/agent", "agent-route-smoke");
  for (const path of ["/agent", "/agent/add-property", "/messages"]) {
    await agent.page.goto(`${BASE_URL}${path}`);
    await agent.page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    check(!agent.page.url().includes("/login"), `Agent route redirected unexpectedly: ${path}`);
  }
  await agent.page.goto(`${BASE_URL}/agent/add-property`);
  await agent.page.getByRole("heading", { name: /Add Property/i }).waitFor({ timeout: 15000 });
  check(await agent.page.getByLabel(/^City$/i).count() === 0, "Direct /agent/add-property route should not render a City field");
  check(await agent.page.getByLabel(/^Area$/i).count() === 0, "Direct /agent/add-property route should not render an Area field");
  await agent.context.close();
}

async function logoutSmoke(browser) {
  const admin = await login(browser, ACCOUNTS.admin, "/admin/dashboard", "admin-logout");
  await admin.page.getByRole("button", { name: /Sign out/i }).click();
  const adminLoggedOut = await admin.page
    .getByRole("button", { name: /^Login$/i })
    .waitFor({ state: "visible", timeout: 2000 })
    .then(() => true)
    .catch(() => false);
  check(adminLoggedOut, "Admin sign out did not update the UI after one click");
  check(new URL(admin.page.url()).pathname === "/", `Admin sign out should navigate home, got ${admin.page.url()}`);
  await admin.context.close();

  const buyer = await login(browser, ACCOUNTS.buyer, "/dashboard", "buyer-logout");
  await buyer.page.locator("header").getByRole("button").last().click();
  await buyer.page.getByRole("menuitem", { name: /Sign out/i }).click();
  const buyerLoggedOut = await buyer.page
    .getByRole("button", { name: /^Login$/i })
    .waitFor({ state: "visible", timeout: 2000 })
    .then(() => true)
    .catch(() => false);
  check(buyerLoggedOut, "Buyer sign out did not update the UI after one click");
  check(new URL(buyer.page.url()).pathname === "/", `Buyer sign out should navigate home, got ${buyer.page.url()}`);
  await buyer.context.close();
}

async function main() {
  console.log(`Smoke testing ${BASE_URL}`);
  await resetTestData();
  await createAdmin();

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    await registerBuyer(browser);
    await registerAgent(browser);
    await approveAgent(browser);
    await createApprovedAgent(ACCOUNTS.agent2, "E2E Agent Two");
    const property = await createAgentProperty(browser);
    if (property?.id) {
      await approvePropertyInAdmin(browser, property.id);
      const conversation = await buyerConversation(browser, property.id);
      await agentReply(browser, conversation.id);
      await buyerReadsReply(browser, conversation.id);
      await agentDirectChat(browser);
    }
    await routeSmoke(browser);
    await logoutSmoke(browser);
  } finally {
    await browser.close();
  }

  failures.push(...pageProblems);
  if (failures.length) {
    console.error("\nSmoke test found issues:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("\nSmoke test passed.");
  console.log(`Admin: ${ACCOUNTS.admin}`);
  console.log(`Buyer: ${ACCOUNTS.buyer}`);
  console.log(`Agent: ${ACCOUNTS.agent}`);
  console.log(`Agent 2: ${ACCOUNTS.agent2}`);
  console.log(`Password: ${PASSWORD}`);
}

main().catch((error) => {
  const collected = [...failures, ...pageProblems];
  if (collected.length) {
    console.error("\nSmoke test collected issues before aborting:");
    for (const failure of collected) console.error(`- ${failure}`);
  }
  console.error(error);
  process.exit(1);
});
