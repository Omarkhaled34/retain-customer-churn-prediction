from django.db import transaction
from customers.models import Customer
from prediction.models import Prediction


@transaction.atomic
def save_predictions(user, inputs, outputs, batch_id=None):
    records = []
    for values, result in zip(inputs, outputs):
        customer = Customer.objects.create(user=user, **values)
        records.append(Prediction.objects.create(user=user, customer=customer, batch_id=batch_id,
            **{key: result[key] for key in ["prediction", "churn_probability", "risk_level", "model_version"]}))
    return records
