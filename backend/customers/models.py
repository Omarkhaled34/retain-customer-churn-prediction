from django.conf import settings
from django.db import models


class Customer(models.Model):
    """An immutable input snapshot preserves historical prediction context."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="customers")
    customer_id = models.CharField(max_length=80)
    age = models.PositiveSmallIntegerField()
    gender = models.CharField(max_length=40)
    tenure = models.PositiveIntegerField()
    usage_frequency = models.PositiveIntegerField()
    support_calls = models.PositiveIntegerField()
    payment_delay = models.PositiveIntegerField()
    subscription_type = models.CharField(max_length=40)
    contract_length = models.CharField(max_length=40)
    total_spend = models.FloatField()
    last_interaction = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["user", "customer_id"])]
