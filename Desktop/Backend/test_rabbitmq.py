import pika

def test_connection():
    try:
        credentials = pika.PlainCredentials("admin", "password")
        parameters = pika.ConnectionParameters(
            host='10.32.245.206',
            port=5672,
            virtual_host='plesples_vhost',
            credentials=credentials,
            connection_attempts=3,
            retry_delay=5
        )
        connection = pika.BlockingConnection(parameters)
        print("Successfully connected to RabbitMQ!")
        channel = connection.channel()
        # channel.queue_declare(queue="plesples_data", durable=True)
        channel.basic_publish(exchange="plesples_exchange", routing_key="plesples_data", body="Hello, RabbitMQ!")
        print("Message sent!")
        connection.close()
    except Exception as e:
        print(f"Connection failed: {str(e)}")
        print(f"Attempted connection to: {parameters.host}:{parameters.port}")
        print(f"Virtual Host: {parameters.virtual_host}")

test_connection()