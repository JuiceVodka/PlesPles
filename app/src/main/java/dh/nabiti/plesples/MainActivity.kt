package dh.nabiti.plesples

import android.content.*
import android.graphics.Color
import android.hardware.Sensor
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.os.IBinder
import android.util.Log
import dh.nabiti.plesples.SensorService.Companion.ACTION_START
import dh.nabiti.plesples.databinding.ActivityMainBinding
import com.rabbitmq.client.ConnectionFactory
import kotlinx.coroutines.*

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    var serviceBound = false

    val uiScope = CoroutineScope(Dispatchers.Main)

    var sensorService :SensorService? = null


    private val reciever : BroadcastReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val action = intent?.action

            if (action != null) {
                Log.d(TAG, action)
            }
        }
    }

    private val mConnection: ServiceConnection = object : ServiceConnection {
        override fun onServiceConnected(componentName: ComponentName, iBinder: IBinder) {
            Log.d(TAG, "Service bound")
            val binder = iBinder as SensorService.RunServiceBinder
            sensorService = binder.service
            serviceBound = true

        }

        override fun onServiceDisconnected(componentName: ComponentName) {
            Log.d(TAG, "Service disconnect")
            serviceBound = false
        }
    }



    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.calibrate.setOnClickListener {
            Log.d("MAINACTIVITY", "CALIBRATING")
            if (!serviceBound) {
                gesturesOn()
                binding.constraintlayout.setBackgroundColor(Color.GREEN)


            } else {
                gesturesOff()
                binding.constraintlayout.setBackgroundColor(Color.RED)
            }
        }

    }

    fun gesturesOn() {
        //start acceleration service
        val i : Intent = Intent(this, SensorService::class.java)
        i.action = ACTION_START
        startService(i)

        //adapted from https://stackoverflow.com/questions/9128103/broadcastreceiver-with-multiple-filters-or-multiple-broadcastreceivers
        val filter : IntentFilter = IntentFilter()
        filter.addAction(SensorService.START_CAPTURING)
        filter.addAction(SensorService.STOP_CAPTURING)
        registerReceiver(reciever, filter)

        Log.d(TAG, "Binding AccelerationService")
        bindService(i, mConnection, 0)
        serviceBound = true
    }

    fun gesturesOff() {
        unbindService(mConnection)
        stopService(Intent(this, SensorService::class.java))
        serviceBound = false
        unregisterReceiver(reciever)
    }


    companion object {
        private val TAG: String? = MainActivity::class.simpleName
    }

}