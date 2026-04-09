import "./style.css";
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { router } from "./router.ts";
import { i18n } from "./i18n.ts";
import { getVersion } from "./version.ts";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(i18n);

// Provide version info globally to all components
app.provide("appVersion", getVersion());

app.mount("#app");
