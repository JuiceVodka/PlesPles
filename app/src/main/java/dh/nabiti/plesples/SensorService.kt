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

    companion object { //from lab 4
        private val TAG: String? = SensorService::class.simpleName
        const val ACTION_STOP = "stop_service"
        const val ACTION_START = "start_service"
        const val START_CAPTURING = "start_capture"
        const val STOP_CAPTURING = "stop_capture"
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
    var sensorStep :Sensor? = null

    var x_tresh_reached = 0
    var z_tresh_reached = 0

    val rotationMatrix = FloatArray(9)

    var isCalibrating = true

    var calibrationVector = FloatArray(2)

    var prevVector = FloatArray(2)

    override fun onBind(intent: Intent): IBinder {
        return serviceBinder
    }

    override fun onCreate() {
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        sensorAccel = sensorManager?.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION)
        //sensorGyro = sensorManager?.getDefaultSensor(Sensor.TYPE_GYROSCOPE)
        sensorGyro = sensorManager?.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)



        if (sensorStep == null) {
            Log.e(TAG, "Step Detector sensor NOT available")
        } else {
            Log.i(TAG, "Step Detector sensor initialized")
        }
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

                // Now worldAcceleration is in world coordinates
                handleStepDirection(worldAcceleration)
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
            //Log.d("VECTOR", "${vector[0]} ${vector[1]}")
            //Log.d("VECTOR-NORM", norm.toString())

            if (isCalibrating) {
                calibrationVector = vector.clone()
                calibrationVector[0] = (calibrationVector[0] / norm).toFloat()
                calibrationVector[1] = (calibrationVector[1] / norm).toFloat()
                isCalibrating = false
            } else {
                vector[0] = (vector[0] / norm).toFloat()
                vector[1] = (vector[1] / norm).toFloat()
                //Log.d("VECTOR", "${vector[0]} ${vector[1]}")
                //Log.d("NORM",
                //    Math.sqrt(((vector[0]* vector[0]) + (vector[1]*vector[1])).toDouble()).toString()
                //)

                val dot = vector[0] * calibrationVector[0] + vector[1] * calibrationVector[1]
                val cross = vector[0] * calibrationVector[1] - vector[1] * calibrationVector[0]

                val dot_with_prev = vector[0] * prevVector[0] + vector[1] * prevVector[1]

                Log.d("VECTOR-DOT", dot.toString())
                Log.d("VECTOR-CROSS", cross.toString())
                //Log.d("VECTOR-DOT-WITH-PREV", dot_with_prev.toString())
                //Log.d("VECTOR-CROSS-WITH-PREV", cross_with_prev.toString())

                if (dot > 0.8 && dot_with_prev < 0) {
                    Log.d("MOVEMENT", "BACKWARD")
                } else if (dot < -0.8 && dot_with_prev < 0) {
                    Log.d("MOVEMENT" ,"FORWARD")
                } else if (dot < 0.4 && dot > -0.4 && dot_with_prev < 0) {
                    if (cross > 0.8) {
                        Log.d("MOVEMENT", "LEFT")
                    } else if (cross < -0.8) {
                        Log.d("MOVEMENT", "RIGHT")
                    }
                }
            }
            prevVector = vector.clone()
        }

        uiScope.launch {
            sendMessageToRabbitMQparsed(worldAccel)
        }
    }

    override fun onAccuracyChanged(p0: Sensor?, p1: Int) {
        Log.d(TAG, "ACCURACY CHANGED")
    }

    suspend fun sendMessageToRabbitMQ(msg:SensorEvent?) {
        withContext(Dispatchers.IO) {
            val factory = ConnectionFactory().apply {
                host = "10.32.245.206"
                virtualHost = "plesples_vhost"
                username = "admin"
                password = "password"
            }

            factory.newConnection().use { connection ->
                connection.createChannel().use { channel ->
                    val exchangeName = "plesples_exchange"
                    val routingKey = "plesples_data"
                    val message = "${msg?.values?.get(0)} ${msg?.values?.get(1)} ${msg?.values?.get(2)} ${msg?.sensor?.type}"

                    channel.basicPublish(exchangeName, routingKey, null, message.toByteArray())
                    Log.d("RabbitMQ", "✅ Message sent!")
                }
            }
        }
    }

    suspend fun sendMessageToRabbitMQparsed(msg:FloatArray) {
        withContext(Dispatchers.IO) {
            val factory = ConnectionFactory().apply {
                host = "10.32.245.206"
                virtualHost = "plesples_vhost"
                username = "admin"
                password = "password"
            }

            factory.newConnection().use { connection ->
                connection.createChannel().use { channel ->
                    val exchangeName = "plesples_exchange"
                    val routingKey = "plesples_data"
                    val message = "${msg[0]} ${msg[1]} ${msg[2]}"

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