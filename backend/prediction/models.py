from django.conf import settings
from django.db import models


class Prediction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="predictions")
    customer = models.OneToOneField("customers.Customer", on_delete=models.CASCADE, related_name="prediction")
    prediction = models.PositiveSmallIntegerField(choices=[(0, "Stay"), (1, "Churn")])
    churn_probability = models.FloatField()
    risk_level = models.CharField(max_length=6, choices=[("Low", "Low"), ("Medium", "Medium"), ("High", "High")])
    model_version = models.CharField(max_length=80)
    batch_id = models.UUIDField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["user", "-created_at"]), models.Index(fields=["user", "risk_level"])]
        constraints = [
            models.CheckConstraint(condition=models.Q(churn_probability__gte=0, churn_probability__lte=1), name="probability_between_zero_and_one"),
            models.CheckConstraint(condition=models.Q(prediction__in=[0, 1]), name="binary_prediction"),
        ]
