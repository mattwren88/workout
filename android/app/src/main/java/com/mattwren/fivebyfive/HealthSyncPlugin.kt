package com.mattwren.fivebyfive

import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.metadata.Metadata
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.time.Instant
import java.time.ZoneId
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * One-way sync of finished sessions into Health Connect as exercise sessions.
 * Records carry a clientRecordId, so writing the same session again updates it
 * instead of duplicating it.
 */
@CapacitorPlugin(name = "HealthSync")
class HealthSyncPlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val permissions = setOf(HealthPermission.getWritePermission(ExerciseSessionRecord::class))
    private val contract = PermissionController.createRequestPermissionResultContract()

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        scope.cancel()
    }

    private fun PluginCall.launch(block: suspend PluginCall.() -> Unit) {
        val call = this
        scope.launch {
            try {
                call.block()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                call.reject(e.message ?: "Health Connect call failed")
            }
        }
    }

    private fun client(): HealthConnectClient? =
        if (HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE) {
            HealthConnectClient.getOrCreate(context)
        } else null

    @PluginMethod
    fun status(call: PluginCall) {
        call.launch {
            val status = when (HealthConnectClient.getSdkStatus(context)) {
                HealthConnectClient.SDK_AVAILABLE -> "available"
                HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "update_required"
                else -> "unavailable"
            }
            val granted = client()?.permissionController?.getGrantedPermissions()?.containsAll(permissions) ?: false
            resolve(JSObject().put("status", status).put("granted", granted))
        }
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        call.launch {
            val c = client() ?: run { reject("Health Connect is not available on this phone."); return@launch }
            if (c.permissionController.getGrantedPermissions().containsAll(permissions)) {
                resolve(JSObject().put("granted", true))
                return@launch
            }
            startActivityForResult(this, contract.createIntent(context, permissions), "onPermissionResult")
        }
    }

    @ActivityCallback
    private fun onPermissionResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        call.launch {
            val granted = client()?.permissionController?.getGrantedPermissions()?.containsAll(permissions) ?: false
            resolve(JSObject().put("granted", granted))
        }
    }

    /** records: [{ id, type: 'strength'|'cycling', start, end (epoch ms), title, notes }] */
    @PluginMethod
    fun writeSessions(call: PluginCall) {
        call.launch {
            val c = client() ?: run { reject("Health Connect is not available on this phone."); return@launch }
            val arr = getArray("records") ?: run { reject("records is required"); return@launch }
            val zone = ZoneId.systemDefault().rules
            val records = (0 until arr.length()).map { i ->
                val r = arr.getJSONObject(i)
                val start = Instant.ofEpochMilli(r.getLong("start"))
                val end = Instant.ofEpochMilli(r.getLong("end"))
                ExerciseSessionRecord(
                    startTime = start,
                    startZoneOffset = zone.getOffset(start),
                    endTime = end,
                    endZoneOffset = zone.getOffset(end),
                    metadata = Metadata.manualEntry(clientRecordId = r.getString("id"), clientRecordVersion = 1),
                    exerciseType = if (r.optString("type") == "cycling") {
                        ExerciseSessionRecord.EXERCISE_TYPE_BIKING
                    } else {
                        ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING
                    },
                    title = r.optString("title").ifEmpty { null },
                    notes = r.optString("notes").ifEmpty { null },
                )
            }
            if (records.isNotEmpty()) c.insertRecords(records)
            resolve(JSObject().put("written", records.size))
        }
    }

    @PluginMethod
    fun deleteSessions(call: PluginCall) {
        call.launch {
            val c = client() ?: run { reject("Health Connect is not available on this phone."); return@launch }
            val ids = getArray("ids")?.toList<String>() ?: emptyList()
            if (ids.isNotEmpty()) {
                c.deleteRecords(ExerciseSessionRecord::class, recordIdsList = emptyList(), clientRecordIdsList = ids)
            }
            resolve()
        }
    }
}
