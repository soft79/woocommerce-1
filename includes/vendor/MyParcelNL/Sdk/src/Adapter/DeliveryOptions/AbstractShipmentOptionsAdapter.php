<?php declare(strict_types=1);

namespace MyParcelNL\Sdk\src\Adapter\DeliveryOptions;

abstract class AbstractShipmentOptionsAdapter
{
    /**
     * @var bool|null
     */
    protected $signature;

    /**
     * @var bool|null
     */
    protected $only_recipient;

    /**
     * @var bool|null
     */
    protected $age_check;

    /**
     * @var bool|null
     */
    protected $large_format;

    /**
     * @var bool|null
     */
    protected $return_shipments;

    /**
     * @var int|null
     */
    protected $insurance;

    /**
     * @return bool|null
     */
    public function hasSignature(): ?bool
    {
        return $this->signature;
    }

    /**
     * @return bool|null
     */
    public function hasOnlyRecipient(): ?bool
    {
        return $this->only_recipient;
    }

    /**
     * @return bool|null
     */
    public function hasAgeCheck(): ?bool
    {
        return $this->age_check;
    }

    /**
     * @return bool|null
     */
    public function hasLargeFormat(): ?bool
    {
        return $this->large_format;
    }

    /**
     * @return bool|null
     */
    public function hasReturnShipments(): ?bool
    {
        return $this->return_shipments;
    }

    /**
     * @return int|null
     */
    public function getInsurance(): ?int
    {
        return $this->insurance;
    }

    /**
     * @return array
     */
    public function toArray(): array
    {
        return [
            'signature'        => $this->hasSignature(),
            'insurance'        => $this->getInsurance(),
            'age_check'        => $this->hasAgeCheck(),
            'only_recipient'   => $this->hasOnlyRecipient(),
            'return_shipments' => $this->hasReturnShipments(),
        ];
    }
}