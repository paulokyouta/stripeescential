#!/usr/bin/env python3
import json
import uuid

# Dados iniciais
def get_initial_data():
    return {
        "settings": {
            "whatsapp_number": "447767993428"
        },
        "products": [
            {
                "id": str(uuid.uuid4()),
                "name_pt": "Produto 1",
                "name_en": "Product 1",
                "description_pt": "Descrição do produto 1",
                "description_en": "Product 1 description",
                "scent_notes_pt": "Notas olfativas 1",
                "scent_notes_en": "Scent notes 1",
                "price_eur": 50.00,
                "price_gbp": 45.00,
                "images": ["https://via.placeholder.com/300?text=Product+1"],
                "featured": True,
                "active": True,
                "order": 0
            },
            {
                "id": str(uuid.uuid4()),
                "name_pt": "Produto 2",
                "name_en": "Product 2",
                "description_pt": "Descrição do produto 2",
                "description_en": "Product 2 description",
                "scent_notes_pt": "Notas olfativas 2",
                "scent_notes_en": "Scent notes 2",
                "price_eur": 60.00,
                "price_gbp": 55.00,
                "images": ["https://via.placeholder.com/300?text=Product+2"],
                "featured": False,
                "active": True,
                "order": 1
            }
        ]
    }

def save_data(data):
    with open("data.json", 'w') as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    save_data(get_initial_data())
    print("Data initialized!")
