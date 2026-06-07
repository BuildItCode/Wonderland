---
name: android
description: >
  Android-specific code quality rules for Jetpack Compose + Kotlin projects.
  Loaded automatically when platform=mobile-android. Extends universal quality rules —
  read quality/SKILL.md first. Incorporates official android/skills guidance for
  Navigation 3, AGP 9, edge-to-edge, R8, XML migration, and Play Billing.
  Reference files load on demand.
---

# Android Quality — Jetpack Compose + Kotlin

Extends `quality/SKILL.md`. Incorporates official guidance from https://github.com/android/skills.

---

## Output Rules

Follow output rules in master `SKILL.md`. Report failures only.

---

## Review Workflow

Load only the reference files relevant to the current task.

1. **Compose UI & previews** → `references/compose.md`
2. **Architecture, ViewModel, Hilt, testing** → `references/architecture.md`
3. **Navigation 3** → `references/navigation.md`
4. **Edge-to-edge, AGP 9, R8, security** → `references/system.md`
5. **XML migration, Play Billing** → `references/migration.md`

Paths relative to this file. In Claude Code: `.agents/skills/quality/platforms/android/references/`.
In OpenCode: `.agents/skills/quality/platforms/android/references/`.

---

## Kotlin

### Null Safety
- Non-nullable types by default; `?` only when `null` is meaningful in the domain
- `!!` never in production — use `?.let`, `?: return`, `?: throw`, or `requireNotNull("reason")`
- `lateinit var` only for DI-injected fields and test setup — never for optional state
- `runCatching` for wrapping third-party APIs that throw checked-style exceptions

### Coroutines
- `suspend` functions never hardcode dispatchers — inject `CoroutineDispatcher` as a parameter
- `viewModelScope` and `lifecycleScope` are the only `launch` sites — never `GlobalScope`
- Structured concurrency: every `launch` is owned by a scope with a clear lifecycle
- `Flow` over `LiveData` for all new code; `StateFlow` / `SharedFlow` for ViewModel outputs
- `callbackFlow` / `channelFlow` to bridge callback APIs into Flow

### Idioms
- `data class` for models; no `var` fields — use `copy()` for updates
- `data object` (Kotlin 1.9+) for singleton sealed states — not bare `object`
- `sealed interface` over `sealed class` for state hierarchies
- `inline + reified` for generic functions that inspect type at runtime
- Extension functions in `{Type}Extensions.kt` — no grab-bag `Utils.kt`
- `value class` for type-safe primitive wrappers (`UserId`, `Email`)

---

## Validation Checklist

```
✓ No !! operators in production code
✓ No GlobalScope usage
✓ No business logic inside @Composable functions
✓ ViewModel exposes single StateFlow<UiState> — not individual fields
✓ ViewModel has no Context, View, Activity, or Compose type references
✓ All StateFlows private; exposed as read-only via asStateFlow()
✓ No hardcoded hex colours or dp values outside MaterialTheme
✓ Every @Composable has modifier: Modifier = Modifier as last non-lambda param
✓ Every leaf composable has @Preview (including dark mode variant)
✓ Sealed states use data object not bare object (Kotlin 1.9+)
✓ Navigation 3: rememberNavBackStack used; 3 standard decorators present
✓ Navigation 3: backStack.size > 1 checked before removeLastOrNull()
✓ Navigation 3: all NavKey types are @Serializable
✓ enableEdgeToEdge() called before setContent in every Activity
✓ No windowOptOutEdgeToEdgeEnforcement in manifest or theme
✓ WindowInsets used for system bar padding — no hardcoded dp for bars
✓ AGP ≥ 9.0; Gradle ≥ 9.1; JDK ≥ 17
✓ kotlin-android plugin removed from all modules (built into AGP 9)
✓ No applicationVariants/libraryVariants — androidComponents.onVariants used
✓ No android.enableLegacyVariantApi in gradle.properties
✓ isMinifyEnabled = true; isShrinkResources = true in release buildType
✓ Sensitive data in EncryptedSharedPreferences or Keystore
✓ No PII or tokens in logs
✓ Play Billing: purchases verified server-side; acknowledged within 3 days
✓ Play Billing: PENDING state handled before granting entitlement
```
