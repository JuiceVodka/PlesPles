import asyncio
import websockets
import json
import time
import pika
from threading import Thread
from data_processor import DataProcessor

connected_clients = []

# RabbitMQ setup and consumer function
def setup_rabbitmq():
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
        routing_key="plesples_data"
    )

    channel.queue_declare(queue="plesples_queue2", durable=True)
    channel.queue_bind(
        exchange="plesples_exchange",
        queue="plesples_queue2",
        routing_key="plesples_data2"
    )
    
    return channel, connection

# Global variable to store the WebSocket loop
websocket_loop = None
processor = DataProcessor()  # Assuming you have a DataProcessor class in data_processor.py
def rabbitmq_callback(ch, method, properties, body):
    
    direction = processor.add_reading(body.decode())
    if direction != None:    
        message = json.dumps({
            "direction": direction,
        })
        print(f"Sending message: {message}")
        asyncio.run_coroutine_threadsafe(broadcast_message(message), websocket_loop)
                
    ch.basic_ack(delivery_tag=method.delivery_tag)

processor2 = DataProcessor()  # Assuming you have a DataProcessor class in data_processor.py
def rabbitmq_callback2(ch, method, properties, body):
    
    direction = processor2.add_reading(body.decode())
    if direction != None:    
        message = json.dumps({
            "direction": direction,
        })
        print(f"Sending message: {message}")
        asyncio.run_coroutine_threadsafe(broadcast_message(message), websocket_loop)
                
    ch.basic_ack(delivery_tag=method.delivery_tag)

async def broadcast_message(message):
    if connected_clients:
        await asyncio.gather(
            *[client.send(message) for client in connected_clients]
        )

async def handle_client(websocket):
    connected_clients.append(websocket)
    try:
        await websocket.wait_closed()
    finally:
        connected_clients.remove(websocket)

def start_rabbitmq_consumer():
    channel, connection = setup_rabbitmq()
    try:
        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(
            queue="plesples_queue",
            on_message_callback=rabbitmq_callback,
            auto_ack=False
        )
        # print(" [*] RabbitMQ consumer started. Waiting for messages...")
        # channel.start_consuming()

        # channel.basic_qos(prefetch_count=1)
        channel.basic_consume(
            queue="plesples_queue2",
            on_message_callback=rabbitmq_callback2,
            auto_ack=False
        )
        print(" [*] RabbitMQ consumer started. Waiting for messages...")
        channel.start_consuming()
    except Exception as e:
        print(f"RabbitMQ consumer error: {e}")
    finally:
        if connection and not connection.is_closed:
            connection.close()

async def main():
    global websocket_loop
    websocket_loop = asyncio.get_event_loop()
    
    # Start RabbitMQ consumer in a separate thread
    rabbitmq_thread = Thread(target=start_rabbitmq_consumer, daemon=True)
    rabbitmq_thread.start()
    
    print("WebSocket server starting on ws://0.0.0.0:9876")
    async with websockets.serve(handle_client, "0.0.0.0", 9876):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())  

