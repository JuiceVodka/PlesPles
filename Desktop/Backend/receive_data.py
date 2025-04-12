from rabbitmq import RabbitMQ
from data_processor import DataProcessor  # Assuming you have a DataProcessor class in data_processor.py
import pika
import sys

# def callback(ch, method, properties, body):
#     print(f"Received message: {body}")
#     # Process


# def main():
#     rabbitmq = RabbitMQ()
#     try:
#         print("Connection to RabbitMQ established successfully.")
#         rabbitmq.consume(queue_name='test_queue', callback=callback)
#     except Exception as e:
#         print(f"Failed to establish connection to RabbitMQ: {e}")
#         sys.exit(1)
#     finally:
#         rabbitmq.close()

# if __name__ == "__main__":
#     main()

processor = DataProcessor()  # Assuming you have a DataProcessor class in data_processor.py

credentials = pika.PlainCredentials("admin", "password")
connection = pika.BlockingConnection(
    pika.ConnectionParameters(
        host="10.32.245.206",
        virtual_host="plesples_vhost",
        credentials=credentials
    )
)
channel = connection.channel()

channel.queue_declare(queue="plesples_queue", durable=True)

channel.queue_bind(
    exchange="plesples_exchange",
    queue="plesples_queue",
    routing_key="plesples_data"  # Same key used in publishing
)

def callback(ch, method, properties, body):
    # print(f" [x] Received {body.decode()}")
    # Add your message processing logic here
    ch.basic_ack(delivery_tag=method.delivery_tag)  # Manual acknowledgment
    processor.add_reading(body.decode())  # Assuming you have a method to process the data

channel.basic_qos(prefetch_count=1)  # Process one message at a time

channel.basic_consume(
    queue="plesples_queue",
    on_message_callback=callback,
    auto_ack=False  # Set to True if you don't want manual acknowledgments
)

print(' [*] Waiting for messages. To exit press CTRL+C')
channel.start_consuming()