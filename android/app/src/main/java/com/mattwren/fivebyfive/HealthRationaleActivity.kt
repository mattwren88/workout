package com.mattwren.fivebyfive

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.widget.ScrollView
import android.widget.TextView

/** Health Connect's required "privacy policy" screen for the permission sheet. */
class HealthRationaleActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val pad = (24 * resources.displayMetrics.density).toInt()
        val text = TextView(this).apply {
            setPadding(pad, pad, pad, pad)
            setTextColor(Color.parseColor("#1D1B17"))
            textSize = 16f
            text = "5×5 and your health data\n\n" +
                "This app writes each workout you finish (start time, end time, type, and the lifts in the notes) " +
                "to Health Connect, so it shows up alongside your other activity.\n\n" +
                "It does not read any health data. Nothing is sent anywhere else: there are no accounts, " +
                "servers or analytics, and your log stays on this phone.\n\n" +
                "Turn sync off any time in the app under Setup, or remove access in Health Connect settings."
        }
        setContentView(ScrollView(this).apply { setBackgroundColor(Color.parseColor("#F3EEE2")); addView(text) })
    }
}
