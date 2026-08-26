import { prisma } from '../src/lib/prisma'
import { encrypt, encryptJson } from '../src/lib/encryption'
import { IntegrationStatus } from '@prisma/client'
import { exchangeAmoCRMCode, syncAmoCRMFull } from '../src/lib/integrations/amocrm'

const longLivedToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImJjODY2NDMyNDdjYjNiMmFjZDlhMDdmNzAyYzRmZjEyZDEwNTA5NGRiMzYyM2IzOTc4NjhhNTYwY2IzNjZjNTU2OWJhMTYxNDhmNmUwY2M4In0.eyJhdWQiOiIwMTVlNWYzNi1mNTE4LTQwMzctOGUzMC02MDcxNGNiOGE2NDUiLCJqdGkiOiJiYzg2NjQzMjQ3Y2IzYjJhY2Q5YTA3ZjcwMmM0ZmYxMmQxMDUwOTRkYjM2MjNiMzk3ODY4YTU2MGNiMzY2YzU1NjliYTE2MTQ4ZjZlMGNjOCIsImlhdCI6MTc4NjAxMzUzMiwibmJmIjoxNzg2MDEzNTMyLCJleHAiOjE5MDA5NzI4MDAsInN1YiI6IjEwNjA3NTE0IiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMxNTM1MTQyLCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJwdXNoX25vdGlmaWNhdGlvbnMiLCJmaWxlcyIsImNybSIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiMTE4MDhjNDEtZmRkNC00MzE1LWFlYmQtNWMxMDFhMDE4NzY1IiwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.hHm2s3I8Ppy6xkRNCGSH6jChcu5UZ2orCk1dgnA4F4loENfXeIMckg0FrTnP0w04cosKj4esrk8UzhpxMsx1k5ffOaU3WtUHiJjjJSTCyUhxddjPeG0oWuV_h7Vin3XJRW1caqVOg2fQT3KluJwWq99_ZDcJbYQEe7THQBeT2baePfxHx1sVbxFPIoXSGhGFueeubC1-vNK2-yqJX7lL6EqP51bX1zkCwvWWdNGGFiWJkIpdjha3CJ58JxIY8an3oP3M7wPoZeOo8mqkFMeiVeDmRieb1-8D-M4jRRGf0c4VBLSI8je98E188OqNHxCw6ov1Y1KHMzuhT7N2eBMyLA"
const authCode = "def50200584dc247bd3839d36c409de6532ea48fcbb56715c1e6393fee34f4957dd233c1d7808be97be6ca39ac3d7e1179aee871987507e8a4c8190ec7767e8dd4a5088afd229bac20973226b6fd5265af0cef223b01781f5689693645b44ce077b36a49870df0a8a77459eae057c4ccaab67c3f02330c334e968b46e68bf18a9e9b2b991e8fd44ce610f2f66787fa40070f0b93cc805081a7909c9eb8205e1efad85386d83dfdba9b3f0f543be81f24b2aae7c463b06042591d551f7ae23926cd60aeb6596afda2f8d18253c4600e987108b2069b6f5e3b8d0fd7a445f30aa37933fe4beb8c5b7415ed932b7b130d7819c131bb940e7a8c3b5b78fad6504be151a9ffde0cb6ed8ff412dba6d7d51c43d6d2eb8429d30922e1eae165e2e0faee19089b0b4dec9ac986ceab3301a1b1c339d279ad11b82fdee79c5169b37c5ba1ab6d5d5139264749622f85c396bdc309ee140b23a47507634edb9a7976926582df33c909a895939a275a2e2291605b6923d868d4d2823668f2c8274c5417a671544a8805a1fe1c0a63b819a7093936be4248ec41d35d3c96d20f81f05424cbf01635fbb630dbefd0bcba1def460cbd7e24e0c1e5bf6d7578fe07c19f8783921676de4823ef05dd18c416d25c42e54a431f13a6e6654af59bd96ac6877c395917939211aa86f63170cc8a6328bb8c731fe01797d5b80947c2a11319adc5c4ce98d0df9e880056b90eaa88d8b5af00e25d4c214bea0a02877e0dbced141a7f589a28081736c573703292"
const domain = "marketincenter.amocrm.ru"

async function run() {
  const company = await prisma.company.findFirst()
  if (!company) {
    console.error('No company found!')
    return
  }

  const companyId = company.id
  console.log(`Setting up amoCRM for company: ${company.name} (${companyId})`)

  // Try OAuth code exchange first if possible
  try {
    console.log('Attempting OAuth code exchange...')
    await exchangeAmoCRMCode({
      code: authCode,
      domain,
      companyId,
    })
    console.log('✅ OAuth code exchange succeeded!')
  } catch (err: any) {
    console.log('OAuth code exchange error:', err.message)
    console.log('Falling back to Long-Lived Bearer Token directly...')

    const expiresAt = new Date('2030-01-01')

    await prisma.cRMIntegration.upsert({
      where: { companyId_provider: { companyId, provider: 'AMOCRM' } },
      create: {
        companyId,
        provider: 'AMOCRM',
        status: IntegrationStatus.CONNECTED,
        accessTokenEnc: encrypt(longLivedToken),
        refreshTokenEnc: encrypt(longLivedToken),
        tokenExpiresAt: expiresAt,
        configEnc: encryptJson({ domain }),
        lastSyncAt: null,
      },
      update: {
        status: IntegrationStatus.CONNECTED,
        accessTokenEnc: encrypt(longLivedToken),
        refreshTokenEnc: encrypt(longLivedToken),
        tokenExpiresAt: expiresAt,
        configEnc: encryptJson({ domain }),
        lastError: null,
      },
    })
    console.log('✅ Long-Lived Token saved to database successfully!')
  }

  // Trigger full sync
  console.log('Starting full sync with amoCRM API...')
  try {
    const result = await syncAmoCRMFull(companyId)
    console.log('🎉 Full Sync Completed Successfully! Stats:', result)
  } catch (syncErr: any) {
    console.error('Sync error:', syncErr.message)
  }
}

run().finally(() => prisma.$disconnect())
