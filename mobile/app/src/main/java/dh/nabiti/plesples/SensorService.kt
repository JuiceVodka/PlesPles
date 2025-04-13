package dh.nabiti.plesples

import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Binder
import android.os.IBinder
import android.util.Log
import com.rabbitmq.client.ConnectionFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class SensorService : Service(), SensorEventListener {

    companion object {
        private val TAG: String? = SensorService::class.simpleName
        const val ACTION_STOP = "stop_service"
        const val ACTION_START = "start_service"
        const val START_CAPTURING = "start_capture"
        const val STOP_CAPTURING = "stop_capture"
        const val FORWARD = "forward"
        const val BACKWARD = "backward"
        const val LEFT = "LEFT"
        const val RIGHT = "RIGHT"
     }

    inner class RunServiceBinder : Binder() {
        val service: SensorService
            get() = this@SensorService
    }

    val uiScope = CoroutineScope(Dispatchers.Main)

    private var serviceBinder = RunServiceBinder()

    var sensorManager : SensorManager? = null
    var sensorAccel :Sensor? = null
    var sensorGyro :Sensor? = null

    val rotationMatrix = FloatArray(9)

    var isCalibrating = true

    var calibrationVector = FloatArray(2)

    var prevVector = FloatArray(2)

    var ip :String = "10.178.86.147"

    override fun onBind(intent: Intent): IBinder {
        if (intent.action.toString().length > 0) {
            ip = intent.action.toString()
        }

        Log.d("IPIPIP", ip.toString())
        return serviceBinder
    }

    override fun onCreate() {
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        sensorAccel = sensorManager?.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION)
        sensorGyro = sensorManager?.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        sensorManager?.registerListener(this, sensorAccel, 50000, 50000)
        sensorManager?.registerListener(this, sensorGyro, SensorManager.SENSOR_DELAY_GAME)

        return START_STICKY
    }

    override fun onSensorChanged(event: SensorEvent?) {
        when (event?.sensor?.type) {
            Sensor.TYPE_ROTATION_VECTOR -> {
                // Save the latest rotation vector for later use
                SensorManager.getRotationMatrixFromVector(rotationMatrix, event.values)
            }

            Sensor.TYPE_LINEAR_ACCELERATION -> {
                val deviceAcceleration = event.values // x, y, z
                val worldAcceleration = FloatArray(3)

                if (deviceAcceleration[0] > 5){
                    Log.d("ACCEL", "FORWARD")
                } else if (deviceAcceleration[0] < -5){
                    Log.d("ACCEL", "BACKWARD")
                } else if (deviceAcceleration[2] > 5){
                    Log.d("ACCEL", "LEFT")
                } else if (deviceAcceleration[2] < -5){
                    Log.d("ACCEL", "RIGHT")
                }

                // Use the most recent rotation matrix to map acceleration to world coordinates
                worldAcceleration[0] =
                    rotationMatrix[0] * deviceAcceleration[0] +
                            rotationMatrix[1] * deviceAcceleration[1] +
                            rotationMatrix[2] * deviceAcceleration[2]

                worldAcceleration[1] =
                    rotationMatrix[3] * deviceAcceleration[0] +
                            rotationMatrix[4] * deviceAcceleration[1] +
                            rotationMatrix[5] * deviceAcceleration[2]

                worldAcceleration[2] =
                    rotationMatrix[6] * deviceAcceleration[0] +
                            rotationMatrix[7] * deviceAcceleration[1] +
                            rotationMatrix[8] * deviceAcceleration[2]

                uiScope.launch {
                    sendMessageToRabbitMQ(event)
                }
            }
        }
    }

    fun handleStepDirection(worldAccel: FloatArray) {
        val x = worldAccel[0]
        val z = worldAccel[1]

        val vector = FloatArray(2)
        vector[0] = x
        vector[1] = z

        val norm = Math.sqrt(((x*x) + (z*z)).toDouble())
        if (norm > 5) {

            if (isCalibrating) {
                calibrationVector = vector.clone()
                calibrationVector[0] = (calibrationVector[0] / norm).toFloat()
                calibrationVector[1] = (calibrationVector[1] / norm).toFloat()
                isCalibrating = false
            } else {
                vector[0] = (vector[0] / norm).toFloat()
                vector[1] = (vector[1] / norm).toFloat()

                val dot = vector[0] * calibrationVector[0] + vector[1] * calibrationVector[1]
                val cross = vector[0] * calibrationVector[1] - vector[1] * calibrationVector[0]

                val dot_with_prev = vector[0] * prevVector[0] + vector[1] * prevVector[1]

                if (dot > 0.8 && dot_with_prev < 0) {
                    Log.d("MOVEMENT", "BACKWARD")
                } else if (dot < -0.8 && dot_with_prev < 0) {
                    Log.d("MOVEMENT" ,"FORWARD")
                } else if (dot < 0.4 && dot > -0.4 && dot_with_prev < 0) {
                    if (cross > 0.7) {
                        Log.d("MOVEMENT", "LEFT")
                    } else if (cross < -0.7) {
                        Log.d("MOVEMENT", "RIGHT")
                    }
                }
            }
            prevVector = vector.clone()
        }
    }

    override fun onAccuracyChanged(p0: Sensor?, p1: Int) {
        Log.d(TAG, "ACCURACY CHANGED")
    }

    suspend fun sendMessageToRabbitMQ(msg:SensorEvent?) {
        withContext(Dispatchers.IO) {
            val factory = ConnectionFactory().apply {
                host = ip
                virtualHost = "plesples_vhost"
                username = "admin"
                password = "password"
            }

            factory.newConnection().use { connection ->
                connection.createChannel().use { channel ->
                    val exchangeName = "plesples_exchange"
                    val routingKey = "plesples_data"
                    val message = "${msg?.values?.get(0)} ${msg?.values?.get(1)} ${msg?.values?.get(2)}"

                    channel.basicPublish(exchangeName, routingKey, null, message.toByteArray())
                    Log.d("RabbitMQ", "✅ Message sent!")
                }
            }
        }
    }



    override fun onDestroy() {
        if (sensorAccel != null) {
            sensorManager?.unregisterListener(this, sensorAccel)
        }

        if (sensorGyro != null) {
            sensorManager?.unregisterListener(this, sensorGyro)
        }
    }
}